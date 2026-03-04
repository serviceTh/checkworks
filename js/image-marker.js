function setupImageMarker(wrapperId, initialMarkerJson = null) {
  const wrapper = document.getElementById(wrapperId);
  if (!wrapper) return;

  const targetImg = wrapper.querySelector('img');
  
  // Create an overlay to capture clicks
  const overlay = document.createElement('div');
  overlay.style.position = 'absolute';
  overlay.style.top = '0';
  overlay.style.left = '0';
  overlay.style.width = '100%';
  overlay.style.height = '100%';
  overlay.style.cursor = 'crosshair';
  overlay.style.zIndex = '5';
  
  wrapper.appendChild(overlay);

  // Status text for guide
  const guide = document.createElement('div');
  guide.style.marginTop = '10px';
  guide.style.color = 'var(--info)';
  guide.innerHTML = '<i>โหมดมาร์กจุดเปิดใช้งาน: คลิกบนรูปภาพเพื่อวางหมุด</i>';
  wrapper.parentNode.insertBefore(guide, wrapper.nextSibling);

  // Container for comment inputs related to markers
  const commentsContainer = document.createElement('div');
  commentsContainer.id = 'marker-comments-container';
  commentsContainer.style.marginTop = '15px';
  wrapper.parentNode.insertBefore(commentsContainer, guide.nextSibling);

  let markerCount = 0;
  const markersData = {}; // {markerId: {id, x, y, comment}}

  const createMarkerUI = (markerId, idNum, xPercent, yPercent, initialComment = "") => {
    // Create Pin
    const pin = document.createElement('div');
    pin.className = 'marker-pin';
    pin.id = markerId;
    pin.style.left = `${xPercent}%`;
    pin.style.top = `${yPercent}%`;
    pin.innerText = idNum;

    wrapper.appendChild(pin);

    // Data Storage
    markersData[markerId] = { id: idNum, x: xPercent, y: yPercent, comment: initialComment };

    // Create Comment Input Field
    const commentRow = document.createElement('div');
    commentRow.className = 'form-group marker-comment-row bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 transition-all hover:border-red-100 group';
    commentRow.id = `${markerId}-input`;
    commentRow.innerHTML = `
      <div class="bg-indigo-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shadow-md">${idNum}</div>
      <input type="text" placeholder="ระบุสิ่งที่ต้องแก้ไขสำหรับจุดที่ ${idNum}..." class="flex-1 bg-transparent border-none outline-none font-medium text-slate-700" value="${initialComment}">
      <button type="button" class="delete-marker-btn text-slate-300 hover:text-red-500 transition-colors p-2 cursor-pointer" title="ลบหมุดนี้">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    `;
    
    const inputField = commentRow.querySelector('input');
    inputField.addEventListener('input', (event) => {
      if (markersData[markerId]) markersData[markerId].comment = event.target.value.trim();
    });

    const deleteBtn = commentRow.querySelector('.delete-marker-btn');
    deleteBtn.onclick = () => {
      pin.remove();
      commentRow.remove();
      delete markersData[markerId];
    };

    commentsContainer.appendChild(commentRow);
  };

  // Load initial markers if provided
  if (initialMarkerJson) {
    try {
      const parsed = JSON.parse(initialMarkerJson);
      parsed.forEach(m => {
        markerCount = Math.max(markerCount, m.id);
        createMarkerUI(`marker-${m.id}`, m.id, m.x, m.y, m.comment || "");
      });
    } catch(e) { console.error("Error parsing initial markers", e); }
  }

  overlay.addEventListener('click', (e) => {
    // Prevent adding if clicked on an existing marker
    if (e.target.classList.contains('marker-pin') || e.target.classList.contains('remove-marker')) return;

    markerCount++;
    const markerId = `marker-${markerCount}`;
    
    // Calculate percentage positions for responsiveness
    const rect = overlay.getBoundingClientRect();
    const xPercent = ((e.clientX - rect.left) / rect.width) * 100;
    const yPercent = ((e.clientY - rect.top) / rect.height) * 100;

    createMarkerUI(markerId, markerCount, xPercent, yPercent, "");
  });

  // Expose function globally so frontend.js can grab the JSON payload
  window.getMarkerDataJson = () => {
    const arr = Object.values(markersData).map((m, idx) => ({...m, id: idx + 1})); // Resequence IDs
    return arr.length === 0 ? "" : JSON.stringify(arr);
  };
}

/**
 * Render markers in Read-only mode (No clicking, no deleting)
 * @param {string} wrapperId - Container ID
 * @param {string} markerJson - JSON string of markers
 */
function renderReadOnlyMarkers(wrapperId, markerJson) {
  const wrapper = document.getElementById(wrapperId);
  if (!wrapper || !markerJson) return;

  let markers = [];
  try {
    markers = JSON.parse(markerJson);
  } catch(e) { return; }

  // Create comments list if not exists
  let commentsContainer = wrapper.parentNode.querySelector('#marker-comments-readonly');
  if (!commentsContainer) {
    commentsContainer = document.createElement('div');
    commentsContainer.id = 'marker-comments-readonly';
    commentsContainer.className = 'mt-6 space-y-3';
    wrapper.parentNode.insertBefore(commentsContainer, wrapper.nextSibling);
  }
  commentsContainer.innerHTML = '<h5 class="font-black text-slate-800 text-sm mb-4">📍 จุดที่แจ้งแก้ไขบนแปลน</h5>';

  markers.forEach((m, idx) => {
    // Pin on Image
    const pin = document.createElement('div');
    pin.className = 'marker-pin readonly';
    pin.style.left = `${m.x}%`;
    pin.style.top = `${m.y}%`;
    pin.innerText = m.id || (idx + 1);
    wrapper.appendChild(pin);

    // Comment List
    if (m.comment) {
      const row = document.createElement('div');
      row.className = 'flex items-start gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 shadow-sm';
      row.innerHTML = `
        <div class="bg-indigo-600 text-white w-6 h-6 shrink-0 rounded-full flex items-center justify-center font-bold text-[10px] shadow-sm">${m.id || (idx+1)}</div>
        <p class="text-slate-600 text-sm font-medium leading-relaxed">${m.comment}</p>
      `;
      commentsContainer.appendChild(row);
    }
  });
}
