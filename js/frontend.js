const STATIC_TOPICS = [
    "งานทุบรื้อ",
    "งานเดินท่อประปา",
    "งานก่อผนัง",
    "งานฉาบผนัง",
    "งานช่องประตูหน้าต่าง",
    "งานปูกระเบื้อง",
    "งานไฟบนฝ้า",
    "งานไฟบนผนัง",
    "งานปูพื้น",
    "งานฝ้าเพดาน",
    "งานทาสี",
    "งานประตูหน้าต่าง",
    "งานบิวอิน",
    "งานไฟบิวอิน",
    "งานติดตั้งสุขภัณฑ์",
    "งานติดตั้งอุปกรณ์เครื่องใช้ไฟฟ้า",
    "งานตกแต่งภายในห้อง",
    "งานเก็บดีเฟค"
];

let allPostsCache = [];
let currentPage = 1;
let currentPostId = null;

document.addEventListener("DOMContentLoaded", () => {
    const isIndexPage = document.getElementById('post-grid') !== null;
    const isInspectPage = document.getElementById('submit-inspection-btn') !== null;

    if (isIndexPage) {
        loadPosts();
        setupIndexListeners();
        listenSystemNotification('frontend', (action) => {
            if (action === 'update_post') loadPosts();
        });
    }

    if (isInspectPage) {
        loadPostDetailFromUrl();
    }
});

async function loadPosts() {
    showLoadingModal("กำลังโหลดรายชื่อโพสต์...");
    const res = await API.getPosts();
    hideLoadingModal();

    if (!res.success) {
        showNotification("เกิดข้อผิดพลาดในการโหลดข้อมูล: " + res.message, "error");
        return;
    }

    allPostsCache = (res.posts || []).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    renderPostGrid();
}

function setupIndexListeners() {
    const searchInput = document.getElementById('search-input');
    const searchBtn = document.getElementById('search-btn');
    const statusFilter = document.getElementById('status-filter');

    if (searchInput) searchInput.addEventListener('input', () => { currentPage = 1; renderPostGrid(); });
    if (searchBtn) searchBtn.addEventListener('click', () => { currentPage = 1; renderPostGrid(); });
    if (statusFilter) statusFilter.addEventListener('change', () => { currentPage = 1; renderPostGrid(); });
}

function renderPostGrid() {
    const grid = document.getElementById('post-grid');
    const pagination = document.getElementById('pagination-container');
    const searchTxt = document.getElementById('search-input').value.toLowerCase();
    const statusFilter = document.getElementById('status-filter').value;

    if (!grid) return;
    grid.innerHTML = '';
    if (pagination) pagination.innerHTML = '';

    let filtered = allPostsCache.filter(p => {
        const titleStr = String(p.title || "");
        const matchName = titleStr.toLowerCase().includes(searchTxt);
        const matchStatus = statusFilter === "" || p.status === statusFilter;
        return matchName && matchStatus;
    });

    if (filtered.length === 0) {
        grid.innerHTML = '<div class="col-span-full text-center py-20 text-slate-400 font-medium">ไม่พบข้อมูลโพสต์</div>';
        return;
    }

    const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const pagePosts = filtered.slice(start, start + ITEMS_PER_PAGE);

    pagePosts.forEach(post => {
        const card = document.createElement('div');
        card.className = 'group bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 p-8 border-2 border-white hover:border-[#b89474]/30 hover:shadow-2xl hover:shadow-[#b89474]/10 hover:-translate-y-2 transition-all duration-500 relative cursor-pointer overflow-hidden';
        card.onclick = () => window.location.href = `frontend_inspect.html?id=${post.post_id}`;
        card.innerHTML = `
            <div class="flex justify-between items-start mb-6">
                <h3 class="text-2xl font-black text-slate-800 group-hover:text-[#b89474] transition-colors leading-tight">${post.title}</h3>
                <span class="px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase badge-${post.status} shadow-sm border border-white/50">${post.status}</span>
            </div>
            <div class="space-y-4 text-slate-500 text-sm mb-8 bg-slate-50/50 p-6 rounded-3xl border border-slate-100 group-hover:bg-white transition-colors">
                <p class="flex items-center gap-3 font-bold text-slate-700">
                    <span class="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center text-lg">👤</span> 
                    <span>${post.inspector_name || 'ยังไม่มีผู้ตรวจ'}</span>
                </p>
                <p class="flex items-center gap-3">
                    <span class="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center text-lg">📅</span> 
                    <span class="font-medium">${new Date(post.created_at).toLocaleString('th-TH', { dateStyle: 'medium' })}</span>
                </p>
            </div>
            <div class="flex gap-3 mt-auto relative z-10">
                <button class="flex-1 py-4 bg-slate-800 text-white rounded-2xl hover:bg-[#b89474] transition-all font-black text-xs uppercase tracking-widest shadow-lg shadow-slate-200">ตรวจสอบงาน</button>
            </div>
            <div class="absolute -right-4 -bottom-4 w-24 h-24 bg-slate-50/50 rounded-full blur-2xl group-hover:bg-[#b89474]/10 transition-all"></div>
        `;
        grid.appendChild(card);
    });

    grid.style.display = 'grid';

    if (pagination && totalPages > 1) {
        for (let i = 1; i <= totalPages; i++) {
            const btn = document.createElement('button');
            btn.className = `w-10 h-10 rounded-xl font-bold transition-all duration-200 ${i === currentPage ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}`;
            btn.innerText = i;
            btn.onclick = () => {
                currentPage = i;
                renderPostGrid();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            };
            pagination.appendChild(btn);
        }
    }
}

async function loadPostDetailFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    const postId = urlParams.get('id');
    if (!postId) {
        showNotification("ไม่พบ ID โพสต์", "error");
        return;
    }
    currentPostId = postId;

    showLoadingModal("กำลังดึงข้อมูลงาน...");
    const res = await API.getPostDetail(postId);
    hideLoadingModal();

    if (!res.success) {
        showNotification("หาข้อมูลโพสต์ไม่เจอ", "error");
        return;
    }

    const { post, slots, inspections } = res;
    document.getElementById('page-title').innerText = post.title;
    document.getElementById('page-status').innerHTML = `สถานะปัจจุบัน: <span class="px-3 py-1 rounded-full text-sm font-bold badge-${post.status}">${post.status}</span>`;
    
    if (post.inspector_name) {
        document.getElementById('inspector-name').value = post.inspector_name;
    }

    renderInspectTopics(slots, inspections, post.drive_3d_link);
}

function renderInspectTopics(slots, inspections, driveLink) {
    const container = document.getElementById('topics-container');
    container.innerHTML = '';

    // Sort slots by order (Plan first, then 1-18)
    slots.sort((a,b) => a.slot_order - b.slot_order).forEach((slot) => {
        const insp = inspections.find(i => i.slot_id === slot.slot_id);
        const div = document.createElement('div');
        div.className = 'bg-white rounded-3xl shadow-lg p-8 border border-slate-100 transition-all duration-300';
        div.dataset.slotId = slot.slot_id;

        let html = `
            <div class="flex justify-between items-start mb-6">
                <div class="bg-blue-50 text-blue-700 px-4 py-1.5 rounded-2xl font-bold text-lg mb-2 inline-block">
                    ${slot.slot_order > 0 ? `${slot.slot_order}. ` : ''}${slot.question}
                </div>
                ${slot.technician_name ? `<div class="bg-slate-50 text-slate-500 px-4 py-1.5 rounded-xl text-sm font-semibold border border-slate-100 italic">👤 ช่าง: ${slot.technician_name}</div>` : ''}
            </div>
        `;

        // Topic 0 Special UI (Plan)
        if (slot.slot_order === 0) {
            const finalDriveLink = driveLink || slot.drive_3d_link;
            if (finalDriveLink) {
                html += `
                    <div class="mb-6">
                        <a href="${finalDriveLink}" target="_blank" class="w-full inline-flex items-center justify-center gap-3 px-6 py-4 bg-slate-800 text-white rounded-2xl hover:bg-slate-900 transition-all shadow-xl font-black text-sm uppercase tracking-widest">
                            <span class="text-xl">📂</span> ดู GOOGLE DRIVE (3D/PLAN)
                        </a>
                    </div>
                `;
            } else {
                html += `
                    <div class="mb-6 p-6 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl text-center">
                        <p class="text-slate-400 font-bold italic">ยังไม่ได้แนบลิ้งก์ Google Drive</p>
                    </div>
                `;
            }
            if (slot.image1) {
                html += `
                    <div class="mb-6 relative rounded-[2.5rem] overflow-hidden border-2 border-slate-100 shadow-inner group" id="plan-marker-wrapper">
                        <img src="${slot.image1}" id="plan-img-target" class="w-full object-contain max-h-[600px]">
                        <div class="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/10 transition-all pointer-events-none"></div>
                    </div>
                `;
                
                if (insp && insp.marker_json) {
                    window.currentTopic0MarkerJson = insp.marker_json;
                    setTimeout(() => {
                        if (window.renderReadOnlyMarkers) {
                            renderReadOnlyMarkers("plan-marker-wrapper", insp.marker_json);
                        }
                    }, 100);
                    
                    html += `
                        <div class="text-center mb-6" id="edit-marker-container">
                            <button class="bg-orange-500 text-white px-10 py-4 rounded-2xl hover:bg-orange-600 transition-all shadow-xl shadow-orange-100 font-black text-sm flex items-center gap-2 mx-auto uppercase tracking-wider" id="edit-marker-btn">
                                ✏️ แก้ไขจุดมาร์กเดิม
                            </button>
                        </div>
                    `;
                } else {
                    html += `
                        <div class="text-center mb-6" id="start-marker-container">
                            <button class="bg-indigo-600 text-white px-10 py-4 rounded-2xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 font-black text-sm flex items-center gap-2 mx-auto uppercase tracking-wider" id="start-marker-btn">
                                📍 เปิดโหมดมาร์กจุดตรวจงาน
                            </button>
                            <div id="marker-preview-${slot.slot_id}" class="mt-4 text-sm font-black text-indigo-600 bg-indigo-50 py-2.5 px-6 rounded-2xl inline-block shadow-sm hidden"></div>
                        </div>
                    `;
                }
            }
        } else {
            // Other topics images
            const imgs = [slot.image1, slot.image2, slot.image3, slot.image4].filter(Boolean);
            if (imgs.length > 0) {
                html += `
                    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                        ${imgs.map(img => `
                            <div class="aspect-square rounded-2xl overflow-hidden border-2 border-white shadow-md cursor-pointer hover:scale-105 hover:shadow-xl transition-all duration-500 bg-slate-100" onclick="previewImage('${img}')">
                                <img src="${img}" class="w-full h-full object-cover">
                            </div>
                        `).join('')}
                    </div>
                `;
            } else {
                html += `<div class="bg-slate-50 text-slate-300 p-10 rounded-3xl text-center mb-8 border-2 border-dashed border-slate-200 font-bold italic">ไม่พบรูปภาพประกอบ</div>`;
            }

            // Radio Options (Grid style)
            html += `<div class="grid grid-cols-2 lg:grid-cols-4 gap-3">`;
            const opts = ["ผ่าน", "กำลังดำเนินการ", "ต้องการแก้ไข", "ไม่ผ่าน"];
            opts.forEach(opt => {
                const isChecked = insp && (insp.selected_radio === opt);
                const inputId = `radio_${slot.slot_id}_${opt}`;
                html += `
                    <label class="flex items-center justify-center p-5 border-2 rounded-2xl cursor-pointer transition-all duration-300 font-black text-[13px] uppercase tracking-wide relative
                                 ${isChecked ? 'radio-active-premium shadow-lg' : 'border-slate-100 bg-slate-50 text-slate-400 hover:bg-white hover:border-[#b89474]/30 hover:text-[#b89474]'}" 
                           for="${inputId}">
                        <input type="radio" name="radio_${slot.slot_id}" id="${inputId}" value="${opt}" class="hidden" ${isChecked ? 'checked' : ''}>
                        ${opt}
                    </label>
                `;
            });
            html += `</div>`;

            // Remark Textarea
            const showRemark = insp && (insp.selected_radio === "ต้องการแก้ไข" || insp.selected_radio === "ไม่ผ่าน");
            html += `
                <div class="comment-box ${showRemark ? '' : 'hidden'} mt-8 pt-8 border-t-2 border-dashed border-slate-100">
                    <label class="block text-sm font-black text-red-500 mb-3 ml-1 flex items-center gap-2">
                        <span class="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                        รายละเอียดที่ต้องการให้แก้ไข *
                    </label>
                    <textarea class="w-full px-6 py-5 bg-white border-2 border-dashed border-slate-300 rounded-[2rem] focus:ring-8 focus:ring-red-50 focus:border-red-400 focus:border-solid outline-none transition-all duration-500 placeholder:text-slate-300 min-h-[160px] font-medium shadow-inner" 
                              placeholder="ตัวอย่าง: กระเบื้อบางจุดมีรอยบิ่น...">${insp ? insp.comment : ''}</textarea>
                </div>
            `;
        }
        div.innerHTML = html;
        container.appendChild(div);
    });

    // Final Submit UI setup
    document.getElementById('submit-inspection-btn').classList.remove('hidden');
    container.classList.remove('hidden');
    
    setupTopicListeners();
}

function setupTopicListeners() {
    const container = document.getElementById('topics-container');

    // Radio change
    container.querySelectorAll('input[type="radio"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            const group = e.target.closest('.grid');
            group.querySelectorAll('label').forEach(lb => {
                lb.classList.remove('radio-active-premium', 'shadow-sm');
                lb.classList.add('border-slate-100', 'bg-slate-50', 'text-slate-500');
            });
            
            const selectedLabel = e.target.closest('label');
            selectedLabel.classList.remove('border-slate-100', 'bg-slate-50', 'text-slate-500');
            selectedLabel.classList.add('radio-active-premium', 'shadow-sm');

            const val = e.target.value;
            const card = e.target.closest('.bg-white');
            const commentBox = card.querySelector('.comment-box');
            
            if (val === "ต้องการแก้ไข" || val === "ไม่ผ่าน") {
                commentBox.classList.remove('hidden');
            } else {
                commentBox.classList.add('hidden');
                const textarea = commentBox.querySelector('textarea');
                if (textarea) textarea.value = ""; // Clear comment if switching to a 'good' status
            }
        });
    });

    // Marker buttons
    const startMarkerBtn = document.getElementById('start-marker-btn');
    if (startMarkerBtn) {
        startMarkerBtn.onclick = () => {
            if (window.setupImageMarker) {
                setupImageMarker('plan-marker-wrapper');
                startMarkerBtn.innerText = "กำลังเปิดโหมดมาร์กจุด...";
                startMarkerBtn.classList.add('opacity-50', 'pointer-events-none');
            }
        };
    }

    const editMarkerBtn = document.getElementById('edit-marker-btn');
    if (editMarkerBtn) {
        editMarkerBtn.onclick = () => {
            if (window.setupImageMarker && window.currentTopic0MarkerJson) {
                // Remove read-only elements
                const wrapper = document.getElementById('plan-marker-wrapper');
                wrapper.querySelectorAll('.marker-pin').forEach(el => el.remove());
                const oldComments = document.getElementById('marker-comments-readonly');
                if (oldComments) oldComments.remove();
                
                // Initialize editable markers with old json
                setupImageMarker('plan-marker-wrapper', window.currentTopic0MarkerJson);
                
                editMarkerBtn.innerText = "กำลังเข้าสู่โหมดแก้ไขมาร์กจุด...";
                editMarkerBtn.classList.add('opacity-50', 'pointer-events-none', 'bg-slate-500');
                
                // Set the currentTopic0MarkerJson to null so final verification relies on getMarkerDataJson
                window.currentTopic0MarkerJson = null; 
            }
        };
    }

    // Submit button
    document.getElementById('submit-inspection-btn').onclick = saveInspection;
}

async function saveInspection() {
    const inspector = document.getElementById('inspector-name').value.trim();
    if (!inspector) {
        showNotification("กรุณาระบุชื่อผู้ตรวจสอบ", "warning");
        document.getElementById('inspector-name').focus();
        return;
    }

    const cards = document.querySelectorAll('.bg-white[data-slot-id]');
    const answers = [];
    let complete = true;

    cards.forEach(card => {
        const slotId = card.dataset.slotId;
        const selected = card.querySelector('input[type="radio"]:checked');
        const commentArea = card.querySelector('textarea');
        const comment = commentArea ? commentArea.value.trim() : '';
        
        const slotOrder = parseInt(card.querySelector('.bg-blue-50')?.innerText || "1"); // Naive order check
        
        const isTopic0 = card.querySelector('#plan-marker-wrapper') !== null || card.querySelector('#start-marker-container') !== null || card.querySelector('#edit-marker-container') !== null;
        
        if (!selected && !isTopic0) {
            complete = false;
            card.classList.add('ring-2', 'ring-red-400', 'ring-offset-4');
        } else {
            card.classList.remove('ring-2', 'ring-red-400', 'ring-offset-4');
            
            const selValue = selected ? selected.value : "";
            
            // Validation for remark
            if ((selValue === "ต้องการแก้ไข" || selValue === "ไม่ผ่าน") && !comment) {
                complete = false;
                if (commentArea) commentArea.classList.add('border-red-400', 'ring-4', 'ring-red-50');
            } else {
                if (commentArea) commentArea.classList.remove('border-red-400', 'ring-4', 'ring-red-50');
            }
            
            let finalMarkerJson = "";
            if (isTopic0) {
                if (window.getMarkerDataJson) {
                    const newMarker = window.getMarkerDataJson();
                    if (newMarker && newMarker !== "") finalMarkerJson = newMarker;
                }
                if (!finalMarkerJson && window.currentTopic0MarkerJson) {
                    finalMarkerJson = window.currentTopic0MarkerJson;
                }
            }

            answers.push({
                slot_id: slotId,
                selected_radio: selValue,
                comment: comment,
                marker_json: finalMarkerJson
            });
        }
    });

    if (!complete) {
        showNotification("กรุณากรอกข้อมูลให้ครบถ้วนและระบุรายละเอียดในข้อที่ต้องแก้ไข", "warning");
        return;
    }

    showConfirmModal("ยืนยันบันทึกผลการตรวจสอบ", "เมื่อบันทึกแล้วจะไม่สามารถแก้ไขได้", async () => {
        showLoadingModal("กำลังบันทึกข้อมูล...");
        
        const res = await API.saveInspection({
            post_id: currentPostId,
            inspector_name: inspector,
            answers: answers
        });
        hideLoadingModal();

        if (res.success) {
            showNotification("บันทึกสำเร็จ!", "success");
            emitSystemNotification('backend', 'update_post');
            setTimeout(() => window.location.href = "index.html", 1500);
        } else {
            showNotification("เกิดข้อผิดพลาด: " + res.message, "error");
        }
    });
}
