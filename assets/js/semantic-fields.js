(function () {
  'use strict';

  const { fetchJSON, getParam, escapeHtml } = window.Lisan;

  const status = document.getElementById('graph-status');
  const svgEl = document.getElementById('graph');
  const wrap = document.getElementById('graph-wrap');
  const fieldTitle = document.getElementById('field-title');
  const fieldSubtitle = document.getElementById('field-subtitle');
  const fieldDescription = document.getElementById('field-description');
  const nodesCount = document.getElementById('nodes-count');
  const linksCount = document.getElementById('links-count');
  const fieldsList = document.getElementById('fields-list');
  const nodeInfo = document.getElementById('node-info');
  const refreshBtn = document.getElementById('refresh-btn');
  const exportPngBtn = document.getElementById('export-png');
  const exportJsonBtn = document.getElementById('export-json');

  if (!window.d3) {
    if (status) status.innerHTML = '<span style="color:#b42318">تعذر تحميل مكتبة الرسم البياني. تحقق من اتصال الإنترنت ثم أعد تحميل الصفحة.</span>';
    return;
  }

  const TYPES = {
    core: { label: 'مفهوم مركزي', color: '#0e6666' },
    event: { label: 'حدث', color: '#e76f51' },
    actor: { label: 'فاعل', color: '#2a9d8f' },
    method: { label: 'طريقة أو وسيلة', color: '#e9c46a' },
    emotion: { label: 'عاطفة', color: '#9b5de5' },
    result: { label: 'نتيجة', color: '#457b9d' }
  };

  let catalog = [];
  let currentField = null;
  let simulation = null;
  let svg = null;
  let zoomGroup = null;
  let width = 800;
  let height = 540;
  let resizeTimer = null;

  function measure() {
    width = Math.max(320, wrap.clientWidth || 800);
    height = window.innerWidth < 640 ? 420 : 540;
    d3.select(svgEl).attr('width', width).attr('height', height).attr('viewBox', '0 0 ' + width + ' ' + height);
  }

  function normalizeField(raw) {
    if (raw && Array.isArray(raw.fields) && raw.fields.length) return raw.fields[0];
    if (raw && Array.isArray(raw.nodes) && Array.isArray(raw.links)) return raw;
    throw new Error('بنية ملف الحقل غير صحيحة');
  }

  function nodeRadius(node) {
    const size = Number(node.size) || 12;
    return Math.max(10, Math.min(26, size));
  }

  function showStatus(html) {
    if (!status) return;
    status.style.display = 'grid';
    status.innerHTML = html;
  }

  function hideStatus() {
    if (status) status.style.display = 'none';
  }

  function linkEndpoint(endpoint) {
    return typeof endpoint === 'object' ? endpoint.id : endpoint;
  }

  function renderField(field, options) {
    const opts = options || {};
    currentField = field;
    measure();

    const nodes = Array.isArray(field.nodes) ? field.nodes.slice() : [];
    const ids = new Set(nodes.map(function (node) { return String(node.id); }));
    const links = (Array.isArray(field.links) ? field.links : []).filter(function (link) {
      return ids.has(String(linkEndpoint(link.source))) && ids.has(String(linkEndpoint(link.target)));
    });

    fieldTitle.textContent = field.title || 'حقل دلالي';
    fieldSubtitle.textContent = (field.description || '').slice(0, 110);
    fieldDescription.textContent = field.description || 'لا يوجد وصف مسجل لهذا الحقل.';
    nodesCount.textContent = nodes.length + ' عقدة';
    linksCount.textContent = links.length + ' رابط';

    svg = d3.select(svgEl);
    svg.selectAll('*').remove();
    svg.attr('aria-label', 'خريطة ' + (field.title || 'حقل دلالي'));

    zoomGroup = svg.append('g');

    const linkSelection = zoomGroup.append('g')
      .attr('stroke', '#b8ccc9')
      .attr('stroke-opacity', 0.75)
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke-width', function (link) { return Math.max(1.2, Math.min(4, Number(link.weight) || 1)); });

    const nodeSelection = zoomGroup.append('g')
      .selectAll('g')
      .data(nodes)
      .join('g')
      .attr('class', 'node')
      .style('cursor', 'grab')
      .call(dragBehavior());

    nodeSelection.append('circle')
      .attr('r', function (node) { return nodeRadius(node); })
      .attr('fill', function (node) { return (TYPES[node.type] || TYPES.core).color; })
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 2.5)
      .style('filter', 'drop-shadow(0 3px 6px rgba(6,78,78,.18))');

    nodeSelection.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', function (node) { return nodeRadius(node) + 16; })
      .attr('font-family', 'Cairo, sans-serif')
      .attr('font-size', function (node) { return node.type === 'core' ? 14 : 12; })
      .attr('font-weight', function (node) { return node.type === 'core' ? 800 : 700; })
      .attr('fill', '#12302e')
      .attr('paint-order', 'stroke')
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 4)
      .attr('stroke-linejoin', 'round')
      .text(function (node) { return node.label || node.id; });

    nodeSelection.append('title').text(function (node) {
      return (node.label || node.id) + ' — ' + ((TYPES[node.type] || TYPES.core).label);
    });

    nodeSelection.on('click', function (event, node) {
      if (event.defaultPrevented) return;
      event.stopPropagation();
      selectNode(node, nodeSelection, linkSelection);
      updateUrl(currentField.id, node.id);
    });

    nodeSelection.on('mouseenter', function (event, node) {
      if (event.buttons) return;
      describeNode(node);
    });

    svg.on('click', function () {
      clearSelection(nodeSelection, linkSelection);
    });

    svg.call(d3.zoom()
      .scaleExtent([0.4, 3])
      .on('zoom', function (event) {
        zoomGroup.attr('transform', event.transform);
      }));

    simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id(function (node) { return node.id; }).distance(function (link) {
        return 120 + (Number(link.weight) || 1) * 6;
      }).strength(0.55))
      .force('charge', d3.forceManyBody().strength(-360))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collide', d3.forceCollide().radius(function (node) { return nodeRadius(node) + 28; }))
      .force('x', d3.forceX(width / 2).strength(0.04))
      .force('y', d3.forceY(height / 2).strength(0.06));

    simulation.on('tick', function () {
      linkSelection
        .attr('x1', function (link) { return link.source.x; })
        .attr('y1', function (link) { return link.source.y; })
        .attr('x2', function (link) { return link.target.x; })
        .attr('y2', function (link) { return link.target.y; });

      nodeSelection.attr('transform', function (node) {
        return 'translate(' + node.x + ',' + node.y + ')';
      });
    });

    setTimeout(function () {
      hideStatus();
    }, 120);

    setTimeout(function () {
      if (opts.nodeId) {
        const target = nodes.find(function (node) { return String(node.id) === String(opts.nodeId); });
        if (target) {
          selectNode(target, nodeSelection, linkSelection);
        }
      }
    }, 650);
  }

  function dragBehavior() {
    return d3.drag()
      .on('start', function (event, node) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        node.fx = node.x;
        node.fy = node.y;
      })
      .on('drag', function (event, node) {
        node.fx = event.x;
        node.fy = event.y;
      })
      .on('end', function (event, node) {
        if (!event.active) simulation.alphaTarget(0);
        node.fx = null;
        node.fy = null;
      });
  }

  function selectNode(node, nodeSelection, linkSelection) {
    nodeSelection.select('circle')
      .attr('stroke', function (item) { return item === node ? '#c9972f' : '#ffffff'; })
      .attr('stroke-width', function (item) { return item === node ? 4.5 : 2.5; });

    nodeSelection.attr('opacity', 1);

    linkSelection
      .attr('stroke', function (link) {
        return link.source === node || link.target === node ? '#c9972f' : '#b8ccc9';
      })
      .attr('stroke-opacity', function (link) {
        return link.source === node || link.target === node ? 1 : 0.22;
      });

    const neighborIds = new Set();
    linkSelection.each(function (link) {
      if (link.source === node) neighborIds.add(link.target.id);
      if (link.target === node) neighborIds.add(link.source.id);
    });

    nodeSelection.attr('opacity', function (item) {
      return item === node || neighborIds.has(item.id) ? 1 : 0.42;
    });

    describeNode(node);
  }

  function clearSelection(nodeSelection, linkSelection) {
    nodeSelection
      .attr('opacity', 1)
      .select('circle')
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 2.5);
    linkSelection
      .attr('stroke', '#b8ccc9')
      .attr('stroke-opacity', 0.75);
    nodeInfo.innerHTML = '<p class="muted small" style="margin:0">اضغط على أي عقدة في الخريطة لعرض تعريفها وأمثلتها هنا.</p>';
  }

  function describeNode(node) {
    const type = TYPES[node.type] || TYPES.core;
    const examples = Array.isArray(node.examples)
      ? node.examples
      : (node.example ? [node.example] : []);

    let html = '<div class="node-name">' + escapeHtml(node.label || node.id) + '</div>';
    html += '<span class="badge" style="margin:4px 0 10px;background:' + type.color + '1a;color:' + type.color + '">' + type.label + '</span>';

    if (node.definition) {
      html += '<p style="margin:8px 0 10px;font-size:.92rem">' + escapeHtml(node.definition) + '</p>';
    } else {
      html += '<p class="muted small" style="margin:8px 0 10px">لا يوجد تعريف مسجل لهذه العقدة.</p>';
    }

    if (examples.length) {
      html += '<div class="section-label" style="margin-top:6px">أمثلة</div><ul style="margin:0;font-size:.88rem;color:#5a7370">';
      examples.forEach(function (example) {
        html += '<li>' + escapeHtml(example) + '</li>';
      });
      html += '</ul>';
    }

    html += '<a class="small" style="display:inline-block;margin-top:10px" href="syns-ants.html?q=' + encodeURIComponent(node.label || node.id) + '">ابحث عن «' + escapeHtml(node.label || node.id) + '» في الترادف والتضاد ←</a>';

    nodeInfo.innerHTML = html;
  }

  function updateUrl(fieldId, nodeId) {
    const params = new URLSearchParams();
    if (fieldId) params.set('field', fieldId);
    if (nodeId) params.set('node', nodeId);
    const url = window.location.pathname + (params.toString() ? '?' + params.toString() : '');
    window.history.replaceState(null, '', url);
  }

  function renderFieldList() {
    fieldsList.innerHTML = '';
    catalog.forEach(function (entry) {
      const field = entry.data;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'field-btn' + (currentField && String(currentField.id) === String(field.id) ? ' active' : '');
      button.dataset.fieldId = field.id;
      button.innerHTML = '<strong>' + escapeHtml(field.title) + '</strong><span>' +
        (field.nodes ? field.nodes.length : 0) + ' عقدة · ' +
        (field.links ? field.links.length : 0) + ' رابط</span>';
      button.addEventListener('click', function () {
        if (currentField && String(currentField.id) === String(field.id)) return;
        selectField(field);
      });
      fieldsList.appendChild(button);
    });
  }

  function selectField(field) {
    currentField = field;
    Array.prototype.forEach.call(fieldsList.querySelectorAll('.field-btn'), function (button) {
      button.classList.toggle('active', String(button.dataset.fieldId) === String(field.id));
    });
    nodeInfo.innerHTML = '<p class="muted small" style="margin:0">اضغط على أي عقدة في الخريطة لعرض تعريفها وأمثلتها هنا.</p>';
    showStatus('<span><span class="spinner"></span> تُرسم الخريطة…</span>');
    renderField(field);
    updateUrl(field.id);
  }

  async function loadField(file) {
    const raw = await fetchJSON(file);
    return normalizeField(raw);
  }

  function download(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  exportJsonBtn.addEventListener('click', function () {
    if (!currentField) return;
    const blob = new Blob([JSON.stringify({ fields: [currentField] }, null, 2)], { type: 'application/json;charset=utf-8' });
    download(blob, 'field-' + (currentField.id || 'semantic') + '.json');
  });

  exportPngBtn.addEventListener('click', function () {
    if (!currentField || !svgEl) return;
    const clone = svgEl.cloneNode(true);
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clone.setAttribute('width', width);
    clone.setAttribute('height', height);

    const background = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    background.setAttribute('width', '100%');
    background.setAttribute('height', '100%');
    background.setAttribute('fill', '#ffffff');
    clone.insertBefore(background, clone.firstChild);

    const source = new XMLSerializer().serializeToString(clone);
    const image = new Image();
    const scale = 2;

    image.onload = function () {
      const canvas = document.createElement('canvas');
      canvas.width = width * scale;
      canvas.height = height * scale;
      const context = canvas.getContext('2d');
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.setTransform(scale, 0, 0, scale, 0, 0);
      context.drawImage(image, 0, 0, width, height);
      canvas.toBlob(function (blob) {
        if (blob) download(blob, 'field-' + (currentField.id || 'semantic') + '.png');
      }, 'image/png');
    };

    image.onerror = function () {
      window.alert('تعذر تصدير الصورة في هذا المتصفح. يمكنك تصدير ملف JSON بدلًا من ذلك.');
    };

    image.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(source);
  });

  refreshBtn.addEventListener('click', function () {
    if (!currentField) return;
    showStatus('<span><span class="spinner"></span> تُعاد ترتيب الخريطة…</span>');
    renderField(currentField);
  });

  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      if (!simulation) return;
      measure();
      simulation.force('center', d3.forceCenter(width / 2, height / 2));
      simulation.force('x', d3.forceX(width / 2).strength(0.04));
      simulation.force('y', d3.forceY(height / 2).strength(0.06));
      simulation.alpha(0.35).restart();
    }, 250);
  });

  async function init() {
    try {
      const manifest = await fetchJSON('data/fields.json');
      const entries = Array.isArray(manifest.fields) ? manifest.fields : [];

      const loaded = await Promise.all(entries.map(async function (entry) {
        try {
          const data = await loadField(entry.file);
          if (!data.title && entry.title) data.title = entry.title;
          if (!data.description && entry.summary) data.description = entry.summary;
          return { meta: entry, data: data };
        } catch (error) {
          console.error('تعذر تحميل الحقل', entry.id, error);
          return null;
        }
      }));

      catalog = loaded.filter(Boolean);
      if (!catalog.length) throw new Error('لا توجد حقول دلالية متاحة');

      const requested = getParam('field');
      const initial = catalog.find(function (entry) {
        return String(entry.data.id) === requested || String(entry.meta.id) === requested;
      }) || catalog[0];

      renderFieldList();
      currentField = initial.data;
      Array.prototype.forEach.call(fieldsList.querySelectorAll('.field-btn'), function (button) {
        button.classList.toggle('active', String(button.dataset.fieldId) === String(initial.data.id));
      });
      renderField(initial.data, { nodeId: getParam('node') });
      updateUrl(initial.data.id, getParam('node'));
    } catch (error) {
      console.error(error);
      showStatus('<span style="color:#b42318">تعذر تحميل الحقول الدلالية.<br>' + escapeHtml(error.message || '') + '</span>');
      fieldsList.innerHTML = '<div class="error-state">تعذر تحميل القائمة.</div>';
      fieldTitle.textContent = 'خطأ في التحميل';
    }
  }

  init();
})();
