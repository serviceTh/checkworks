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
let statusChart = null;
let currentTimeframe = 'all';

document.addEventListener("DOMContentLoaded", () => {
    const isIndexPage = document.getElementById('post-grid') !== null;
    const isDashboardPage = document.getElementById('statusChart') !== null;
    const isPostPage = document.getElementById('save-post-btn') !== null;
    const isEditPage = document.getElementById('update-post-btn') !== null;

    if (isIndexPage || isDashboardPage) {
        initAdminData(isDashboardPage);
        listenSystemNotification('backend', (action) => {
            if (action === 'update_post' || action === 'new_post') initAdminData(isDashboardPage);
        });
    }

    if (isIndexPage) setupIndexListeners();
    if (isPostPage) { renderStaticTopics(); setupPostListeners(); }
    if (isEditPage) loadPostDetailFromUrl();
});

async function initAdminData(isDashboard) {
    showLoadingModal("กำลังโหลดข้อมูล...");
    const res = await API.getPosts();
    hideLoadingModal();

    if (!res.success) {
        showNotification("เกิดข้อผิดพลาดในการโหลดข้อมูล: " + res.message, "error");
        return;
    }

    allPostsCache = (res.posts || []).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    if (isDashboard) {
        renderDashboard();
    } else {
        renderPostGrid();
    }
}

// --- Dashboard Logic ---
function renderDashboard() {
    const timeframe = currentTimeframe;
    const stats = calculateStats(timeframe);
    
    // Update Cards
    document.getElementById('total-posts').innerText = stats.total;
    document.getElementById('wait-count').innerText = stats.wait;
    document.getElementById('done-count').innerText = stats.done;
    document.getElementById('fix-count').innerText = stats.fix;

    // Update List
    const list = document.getElementById('recent-list');
    list.innerHTML = '';
    const recent = stats.filteredData.slice(0, 10);
    
    if (recent.length === 0) {
        list.innerHTML = '<div class="py-10 text-center text-slate-400">ไม่มีรายการในช่วงเวลานี้</div>';
    } else {
        recent.forEach(post => {
            const row = document.createElement('div');
            row.className = 'py-4 flex justify-between items-center hover:bg-slate-50 px-4 -mx-4 rounded-xl transition-all cursor-pointer';
            row.onclick = () => location.href = `admin_edit.html?id=${post.post_id}`;
            row.innerHTML = `
                <div class="flex-1">
                    <p class="font-bold text-slate-800">${post.title}</p>
                    <p class="text-xs text-slate-400 mt-1">${new Date(post.created_at).toLocaleString('th-TH')}</p>
                </div>
                <div class="flex items-center gap-4">
                    <span class="px-3 py-1 rounded-full text-[10px] font-black uppercase badge-${post.status}">${post.status}</span>
                </div>
            `;
            list.appendChild(row);
        });
    }

    updateStatusChart(stats);
}

function calculateStats(timeframe) {
    const now = new Date();
    let filteredData = allPostsCache;

    if (timeframe !== 'all') {
        filteredData = allPostsCache.filter(p => {
            const date = new Date(p.created_at);
            if (timeframe === 'day') {
                return date.toDateString() === now.toDateString();
            } else if (timeframe === 'week') {
                const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                return date >= weekAgo;
            } else if (timeframe === 'month') {
                return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
            }
            return true;
        });
    }

    const wait = filteredData.filter(p => p.status === 'รอตรวจ').length;
    const done = filteredData.filter(p => p.status === 'ตรวจแล้ว').length;
    const fix = filteredData.filter(p => p.status === 'รอแก้ไข').length;

    return {
        total: filteredData.length,
        wait,
        done,
        fix,
        filteredData
    };
}

function updateStatusChart(stats) {
    const ctx = document.getElementById('statusChart').getContext('2d');
    
    if (statusChart) statusChart.destroy();
    
    if (stats.total === 0) {
        // Show empty chart placeholder if needed, but Chart.js can handle zero
    }

    statusChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['รอตรวจ', 'ตรวจแล้ว', 'รอแก้ไข'],
            datasets: [{
                data: [stats.wait, stats.done, stats.fix],
                backgroundColor: [
                    '#fbbf24', // amber-400
                    '#4ade80', // green-400
                    '#f87171'  // red-400
                ],
                borderWidth: 0,
                hoverOffset: 15
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        usePointStyle: true,
                        padding: 20,
                        font: { family: 'Prompt', size: 12, weight: '600' }
                    }
                }
            },
            cutout: '70%',
            animation: {
                animateScale: true,
                animateRotate: true
            }
        }
    });
}

function changeTimeframe(tf) {
    currentTimeframe = tf;
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('bg-blue-600', 'text-white', 'shadow-lg', 'shadow-blue-100');
        btn.classList.add('bg-white', 'text-slate-600', 'border', 'border-slate-200');
    });
    
    const activeBtn = document.getElementById('filter-' + tf);
    activeBtn.classList.remove('bg-white', 'text-slate-600', 'border', 'border-slate-200');
    activeBtn.classList.add('bg-blue-600', 'text-white', 'shadow-lg', 'shadow-blue-100');
    
    renderDashboard();
}

// --- Original List Logic ---
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
    const searchTxt = document.getElementById('search-input')?.value.toLowerCase() || "";
    const statusFilter = document.getElementById('status-filter')?.value || "";

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
        card.className = 'group bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 p-8 border-2 border-white hover:border-blue-100 hover:shadow-2xl hover:shadow-blue-100/50 hover:-translate-y-2 transition-all duration-500 relative cursor-pointer overflow-hidden';
        card.onclick = () => location.href='admin_edit.html?id=' + post.post_id;
        card.innerHTML = `
            <div class="flex justify-between items-start mb-6">
                <h3 class="text-2xl font-black text-slate-800 group-hover:text-blue-600 transition-colors leading-tight">${post.title}</h3>
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
                <button class="flex-1 py-4 bg-slate-800 text-white rounded-2xl hover:bg-blue-600 transition-all font-black text-xs uppercase tracking-widest shadow-lg shadow-slate-200" onclick="event.stopPropagation(); location.href='admin_edit.html?id=${post.post_id}'">จัดการงาน</button>
                <button class="px-5 py-4 bg-red-50 text-red-500 rounded-2xl hover:bg-red-100 hover:text-red-600 transition-all flex items-center justify-center border border-red-100 shadow-sm" onclick="event.stopPropagation(); deletePost('${post.post_id}')">🗑️</button>
            </div>
            
            <div class="absolute -right-4 -bottom-4 w-24 h-24 bg-slate-50/50 rounded-full blur-2xl group-hover:bg-blue-50/50 transition-all"></div>
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
            };
            pagination.appendChild(btn);
        }
    }
}

function renderStaticTopics() {
    const container = document.getElementById('static-topics-container');
    STATIC_TOPICS.forEach((topic, index) => {
        container.appendChild(createTopicHTML(index + 1, topic));
    });
}

function createTopicHTML(order, question, data = null) {
    const div = document.createElement('div');
    div.className = 'topic-item bg-white rounded-3xl shadow-lg p-8 border border-slate-100 transition-all duration-300';
    div.dataset.order = order;
    div.dataset.question = question;
    if (data && data.slot_id) {
        div.dataset.slotId = data.slot_id;
    }

    // Current images from data or empty strings
    const currentImgs = data ? [data.image1, data.image2, data.image3, data.image4] : ['', '', '', ''];

    let slotsHtml = '';
    for (let i = 0; i < 4; i++) {
        const imgSrc = currentImgs[i] || '';
        slotsHtml += `
            <div class="image-slot relative aspect-square rounded-2xl border-2 border-dashed ${imgSrc ? 'border-blue-200 bg-blue-50/30' : 'border-slate-200 bg-slate-50/50'} hover:border-blue-400 transition-all overflow-hidden group">
                <input type="file" accept="image/*" class="slot-input absolute inset-0 opacity-0 cursor-pointer z-20 ${imgSrc ? 'hidden' : ''}">
                <div class="slot-content absolute inset-0 flex items-center justify-center pointer-events-none">
                    ${imgSrc ? `<img src="${imgSrc}" class="w-full h-full object-cover cursor-zoom-in pointer-events-auto" onclick="previewImage('${imgSrc}')">` : '<span class="text-slate-300 text-2xl font-light pointer-events-none">+</span>'}
                </div>
                <div class="slot-preview h-full w-full absolute inset-0 hidden z-10">
                    <img class="w-full h-full object-cover cursor-zoom-in" onclick="previewImage(this.src)">
                </div>
                ${imgSrc ? `<button type="button" class="clear-slot-btn absolute top-2 right-2 bg-red-500 text-white w-7 h-7 rounded-full flex items-center justify-center z-[30] opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">×</button>` : ''}
            </div>
        `;
    }

    let rightSideContent = `
            <div class="bg-indigo-50/30 rounded-3xl p-6 border border-indigo-100/50 flex flex-col justify-center h-full">
                <div class="flex items-center gap-2 mb-4">
                    <span class="text-xl">💡</span>
                    <p class="text-sm font-bold text-indigo-700">คำแนะนำสำหรับ Admin</p>
                </div>
                <p class="text-xs text-indigo-600 leading-relaxed font-medium">
                    รูปภาพที่อัปโหลดจะถูกบีบอัดให้ไม่เกิน 50KB อัตโนมัติ เพื่อประหยัดพื้นที่บน Google Sheets กรุณาเลือกรูปภาพที่ชัดเจนเพื่อให้หน้าบ้านตรวจสอบได้ง่าย
                </p>
            </div>
    `;

    if (data && data.slot_id && window.currentPostInspections) {
        const insp = window.currentPostInspections.find(i => i.slot_id === data.slot_id);
        if (insp) {
            let statusBadge = `<span class="px-3 py-1 bg-green-100 text-green-700 rounded-lg shadow-sm font-bold text-sm">ผ่าน</span>`;
            let ringColor = 'ring-green-400 ring-offset-2';
            let bgColor = 'bg-stone-50';
            
            if (insp.selected_radio === 'ไม่ผ่าน') {
                statusBadge = `<span class="px-3 py-1 bg-red-100 text-red-700 rounded-lg shadow-sm font-bold text-sm border border-red-200">ไม่ผ่าน</span>`;
                ringColor = 'ring-red-400 ring-offset-2';
                bgColor = 'bg-red-50/50';
            }
            if (insp.selected_radio === 'ต้องการแก้ไข') {
                statusBadge = `<span class="px-3 py-1 bg-orange-100 text-orange-700 rounded-lg shadow-sm font-bold text-sm border border-orange-200">ต้องการแก้ไข</span>`;
                ringColor = 'ring-orange-400 ring-offset-2';
                bgColor = 'bg-orange-50/50';
            }

            rightSideContent = `
                <div class="rounded-3xl p-6 border-2 border-dashed border-slate-200 ${bgColor} flex flex-col justify-center h-full ring-2 ${ringColor} transition-all">
                    <div class="flex items-center justify-between mb-4">
                        <span class="text-sm font-bold text-slate-700">ผลการตรวจสอบล่าสุด:</span>
                        ${statusBadge}
                    </div>
                    ${insp.comment ? `<div class="mt-2 text-sm font-medium bg-white p-4 rounded-2xl border border-white shadow-sm text-slate-600 border-l-4 border-l-slate-400">💬 หมายเหตุ: ${insp.comment}</div>` : '<div class="mt-2 text-sm text-slate-400 italic">ไม่มีหมายเหตุเพิ่มเติม</div>'}
                </div>
            `;
        }
    }

    div.innerHTML = `
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <h3 class="text-xl font-bold text-slate-800 flex items-center gap-3">
                <span class="bg-blue-50 text-blue-600 w-10 h-10 rounded-xl flex items-center justify-center text-lg">${order}.</span>
                ${question}
            </h3>
            ${data ? '' : `<button type="button" class="text-red-400 hover:text-red-600 font-bold hidden" onclick="this.closest('.topic-item').remove()">ลบหัวข้อนี้</button>`}
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div class="space-y-4">
                <div class="space-y-2">
                    <label class="block text-sm font-bold text-slate-600 ml-1">👤 ช่างผู้รับผิดชอบ</label>
                    <input type="text" class="tech-name w-full px-5 py-3.5 bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-400 focus:border-solid outline-none transition-all" 
                           placeholder="ระบุชื่อช่าง..." value="${data ? data.technician_name || '' : ''}">
                </div>
                <div class="space-y-2">
                    <label class="block text-sm font-bold text-slate-600 ml-1">📸 รูปภาพงาน (สูงสุด 4 รูป)</label>
                    <div class="grid grid-cols-4 gap-3 mt-2">
                        ${slotsHtml}
                    </div>
                    <p class="text-[10px] text-slate-400 mt-2 font-medium">กดที่ช่องเพื่ออัปโหลด หรือเปลี่ยนรูปภาพ</p>
                </div>
            </div>
            
            ${rightSideContent}
        </div>
    `;

    // Handle interactive slots
    div.querySelectorAll('.image-slot').forEach(slot => {
        const input = slot.querySelector('.slot-input');
        const preview = slot.querySelector('.slot-preview');
        const previewImg = preview.querySelector('img');
        const clearBtn = slot.querySelector('.clear-slot-btn');

        input.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (re) => {
                    previewImg.src = re.target.result;
                    preview.classList.remove('hidden');
                    slot.classList.add('border-blue-400', 'bg-blue-50/30');
                    input.classList.add('hidden'); // Hide input to allow clicking the image
                    
                    // Add clear button if not exists
                    let clearBtnInner = slot.querySelector('.clear-slot-btn');
                    if (!clearBtnInner) {
                        clearBtnInner = document.createElement('button');
                        clearBtnInner.type = "button";
                        clearBtnInner.className = "clear-slot-btn absolute top-2 right-2 bg-red-500 text-white w-7 h-7 rounded-full flex items-center justify-center z-[30] opacity-0 group-hover:opacity-100 transition-opacity shadow-lg";
                        clearBtnInner.innerHTML = "×";
                        slot.appendChild(clearBtnInner);
                    }
                    
                    clearBtnInner.onclick = (ev) => {
                        ev.stopPropagation();
                        input.value = "";
                        input.classList.remove('hidden');
                        preview.classList.add('hidden');
                        previewImg.src = "";
                        slot.classList.remove('border-blue-400', 'bg-blue-50/30');
                        clearBtnInner.remove();
                    };
                };
                reader.readAsDataURL(file);
            }
        });

        if (clearBtn) {
            clearBtn.onclick = (e) => {
                e.stopPropagation();
                input.value = "";
                // If it was an existing image from data, we'll mark it for removal by clearing the img source
                const existingImg = slot.querySelector('img:not(.slot-preview img)');
                if (existingImg) existingImg.src = ""; 
                preview.classList.add('hidden');
                previewImg.src = "";
                slot.classList.remove('border-blue-400', 'bg-blue-50/30');
                slot.querySelector('.absolute.inset-0.flex')?.classList.remove('hidden');
                clearBtn.remove();
                slot.dataset.cleared = "true";
            };
        }
    });

    return div;
}

function setupPostListeners() {
  document.getElementById('plan-image-upload').onchange = (e) => {
    const preview = document.getElementById('plan-image-preview');
    preview.innerHTML = '';
    if (e.target.files[0]) {
      const img = document.createElement('img');
      img.src = URL.createObjectURL(e.target.files[0]);
      img.className = 'w-full rounded-2xl shadow-lg border border-slate-200';
      preview.appendChild(img);
    }
  };

  document.getElementById('add-custom-topic-btn').onclick = () => {
    const q = prompt("ระบุชื่อหัวข้อที่ต้องการเพิ่ม:");
    if (q) {
      const container = document.getElementById('custom-topics-container');
      const order = container.children.length + STATIC_TOPICS.length + 1;
      const html = createTopicHTML(order, q);
      html.querySelector('.text-red-400').classList.remove('hidden');
      container.appendChild(html);
    }
  };

  document.getElementById('save-post-btn').onclick = async () => {
    const title = document.getElementById('post-title').value.trim();
    if (!title) return showNotification("กรุณากรอกชื่อโพสต์", "warning");

    showLoadingModal("กำลังบันทึกและอัปโหลดรูปภาพ...");
    
    // Collect all topics starting with regular topics
    const slots = [];
    
    // Topic 0: Plan (Special handling to include in slots)
    const planFile = document.getElementById('plan-image-upload').files[0];
    const planImage = planFile ? await compressImageToBase64(planFile) : null;
    const driveLink = document.getElementById('drive-link').value.trim();
    
    slots.push({
        slot_order: 0,
        question: "ผังหรือแปลนงาน",
        technician_name: "-",
        image1: planImage || "",
        image2: "",
        image3: "",
        image4: "",
        radio_options: ["ผ่าน", "กำลังดำเนินการ", "ต้องการแก้ไข", "ไม่ผ่าน"]
    });

    const topicDivs = document.querySelectorAll('.topic-item');
    for (let div of topicDivs) {
        const order = div.dataset.order;
        const slotId = div.dataset.slotId;
        const question = div.dataset.question;
        const tech = div.querySelector('.tech-name').value.trim();
        const slotElements = div.querySelectorAll('.image-slot');
        
        const slotData = { 
            slot_id: slotId,
            slot_order: parseInt(order), 
            question,
            technician_name: tech,
            image1: "",
            image2: "",
            image3: "",
            image4: ""
        };
        
        for (let i = 0; i < slotElements.length; i++) {
            const slot = slotElements[i];
            const input = slot.querySelector('.slot-input');
            const file = input.files[0];
            const existingImg = slot.querySelector('img:not(.slot-preview img)');
            
            let finalImg = "";
            if (file) {
                finalImg = await compressImageToBase64(file);
            } else if (existingImg && existingImg.src && !slot.dataset.cleared) {
                finalImg = existingImg.src;
            }
            
            slotData[`image${i+1}`] = finalImg;
        }
        slots.push(slotData);
    }

    const payload = {
      title,
      poster_name: document.getElementById('poster-name').value,
      drive_3d_link: driveLink,
      slots
    };

    const res = await API.createPost(payload);
    hideLoadingModal();

    if (res.success) {
      showNotification("สร้างโพสต์สำเร็จ!", "success");
      emitSystemNotification('frontend', 'update_post');
      setTimeout(() => location.href = 'admin_index.html', 1500);
    } else {
      showNotification("ผิดพลาด: " + res.message, "error");
    }
  };
}

async function loadPostDetailFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    const postId = urlParams.get('id');
    if (!postId) return showNotification("ไม่พบ ID โพสต์", "error");

    showLoadingModal("กำลังโหลดรายละเอียด...");
    const res = await API.getPostDetail(postId);
    hideLoadingModal();

    if (!res.success) return showNotification("โหลดข้อมูลไม่สำเร็จ", "error");

    const { post, slots, inspections } = res;
    window.currentPostData = post;
    window.currentPostSlots = slots;
    window.currentPostInspections = inspections;

    const topic0 = slots.find(s => s.slot_order === 0);
    if (topic0) {
        window.currentTopic0Id = topic0.slot_id;
    }

    document.getElementById('page-title').innerText = "แก้ไขงาน: " + post.title;
    document.getElementById('page-status').innerHTML = `สถานะปัจจุบัน: <span class="px-3 py-1 rounded-full text-sm font-bold badge-${post.status}">${post.status}</span>`;
    
    document.getElementById('edit-title').value = post.title;
    document.getElementById('edit-inspector').value = post.inspector_name || '-';
    document.getElementById('edit-drive-link').value = post.drive_3d_link || '';

    if (topic0 && topic0.image1) {
        const preview = document.getElementById('plan-image-preview');
        preview.className = "mt-8 relative rounded-[2.5rem] overflow-hidden border-2 border-slate-100 shadow-inner group flex justify-center";
        preview.id = "admin-plan-wrapper";
        preview.innerHTML = `<img src="${topic0.image1}" class="w-full object-contain max-h-[600px]">`;
        
        // Show markers if inspection exists
        const planInsp = inspections?.find(i => i.slot_id === topic0.slot_id);
        if (planInsp && planInsp.marker_json) {
            // Need to ensure image-marker.js is loaded or the function is available
            if (window.renderReadOnlyMarkers) {
                setTimeout(() => {
                    renderReadOnlyMarkers("admin-plan-wrapper", planInsp.marker_json);
                }, 100);
            }
        }
        
        // Show topic 0 radio status & comment
        if (planInsp && planInsp.selected_radio) {
            let statusBadge = `<span class="px-3 py-1 bg-green-100 text-green-700 rounded-lg shadow-sm font-bold text-sm">ผ่าน</span>`;
            let ringColor = 'ring-green-400 ring-offset-2';
            let bgColor = 'bg-stone-50';
            
            if (planInsp.selected_radio === 'ไม่ผ่าน') {
                statusBadge = `<span class="px-3 py-1 bg-red-100 text-red-700 rounded-lg shadow-sm font-bold text-sm border border-red-200">ไม่ผ่าน</span>`;
                ringColor = 'ring-red-400 ring-offset-2';
                bgColor = 'bg-red-50/50';
            }
            if (planInsp.selected_radio === 'ต้องการแก้ไข') {
                statusBadge = `<span class="px-3 py-1 bg-orange-100 text-orange-700 rounded-lg shadow-sm font-bold text-sm border border-orange-200">ต้องการแก้ไข</span>`;
                ringColor = 'ring-orange-400 ring-offset-2';
                bgColor = 'bg-orange-50/50';
            }

            const inspHtml = `
                <div class="mt-8 rounded-3xl p-6 border-2 border-dashed border-slate-200 ${bgColor} flex flex-col justify-center ring-2 ${ringColor} transition-all">
                    <div class="flex items-center justify-between mb-2">
                        <span class="text-sm font-bold text-slate-700">ผลการตรวจสอบแปลน/ผัง:</span>
                        ${statusBadge}
                    </div>
                    ${planInsp.comment ? `<div class="mt-3 text-sm font-medium bg-white p-4 rounded-2xl border border-white shadow-sm text-slate-600 border-l-4 border-l-slate-400">💬 หมายเหตุ: ${planInsp.comment}</div>` : '<div class="mt-3 text-sm text-slate-400 italic">ไม่มีหมายเหตุเพิ่มเติม</div>'}
                </div>
            `;
            setTimeout(() => {
                const topic0Div = document.getElementById('topic-0');
                if (topic0Div) topic0Div.insertAdjacentHTML('beforeend', inspHtml);
            }, 50);
        }
    }

    renderEditTopics(slots);
    
    // Previous standalone results list is no longer needed since it's integrated above
    // if (inspections && inspections.length > 0) {
    //     renderInspectionResults(slots, inspections);
    // }

    // Setup Edit Submit
    document.getElementById('update-post-btn').classList.remove('hidden');
    document.getElementById('update-post-btn').onclick = () => savePostUpdate(postId);

    if (post.status !== "รอตรวจ") {
        document.getElementById('readonly-warning').classList.remove('hidden');
        
        // Disable editing for core info to preserve original context after inspection
        const titleInput = document.getElementById('edit-title');
        if (titleInput) { 
            titleInput.disabled = true; 
            titleInput.classList.add('cursor-not-allowed', 'opacity-60', 'bg-slate-100'); 
        }
        
        const driveLinkInput = document.getElementById('edit-drive-link');
        if (driveLinkInput) { 
            driveLinkInput.disabled = true; 
            driveLinkInput.classList.add('cursor-not-allowed', 'opacity-60', 'bg-slate-100'); 
        }
        
        const planImgInput = document.getElementById('edit-plan-image-upload');
        if (planImgInput) { 
            planImgInput.disabled = true; 
            planImgInput.classList.add('cursor-not-allowed', 'opacity-60'); 
        }
        
        document.querySelectorAll('.tech-name').forEach(el => {
            el.disabled = true;
            el.classList.add('cursor-not-allowed', 'opacity-60', 'bg-slate-100');
        });
    }
}

function renderEditTopics(slots) {
    const container = document.getElementById('edit-topics-container');
    container.innerHTML = '';
    slots.filter(s => s.slot_order > 0).sort((a,b) => a.slot_order - b.slot_order).forEach(slot => {
        container.appendChild(createTopicHTML(slot.slot_order, slot.question, slot));
    });
}

function renderInspectionResults(slots, inspections) {
    const container = document.getElementById('inspection-results-container');
    const list = document.getElementById('results-list');
    container.classList.remove('hidden');
    list.innerHTML = '';

    inspections.forEach(insp => {
        const slot = slots.find(s => s.slot_id === insp.slot_id);
        const div = document.createElement('div');
        div.className = 'bg-white rounded-3xl shadow-lg p-8 border border-slate-100';
        
        let statusColor = 'text-green-600';
        if (insp.selected_radio === 'ไม่ผ่าน') statusColor = 'text-red-600';
        if (insp.selected_radio === 'ต้องการแก้ไข') statusColor = 'text-orange-600';

        div.innerHTML = `
            <div class="flex justify-between items-start mb-6">
                <div>
                   <h4 class="font-bold text-xl text-slate-800">${slot ? slot.question : 'หัวข้อที่สูญหาย'}</h4>
                   <p class="text-sm font-bold mt-1 ${statusColor}">📍 ผลตรวจ: ${insp.selected_radio}</p>
                </div>
            </div>
            ${insp.comment ? `<div class="bg-red-50 p-6 rounded-2xl mb-4 border-2 border-dashed border-red-100 text-red-700 font-medium">💬 หมายเหตุ: ${insp.comment}</div>` : ''}
            ${insp.marker_json ? `
                <div class="bg-indigo-50 p-6 rounded-2xl border-2 border-dashed border-indigo-100 text-indigo-700 text-sm font-black flex items-center justify-between gap-2">
                    <div class="flex items-center gap-2">📍 มีการมาร์กจุดตรวจงานบนรูปแปลน</div>
                    <button onclick="document.getElementById('topic-0').scrollIntoView({behavior:'smooth'})" class="text-xs bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-indigo-700 transition-all font-bold shadow-lg">เลื่อนไปดูที่รูปแปลน</button>
                </div>
            ` : ''}
        `;
        list.appendChild(div);
    });
}

async function savePostUpdate(postId) {
    const title = document.getElementById('edit-title').value.trim();
    if (!title) return showNotification("กรุณากรอกชื่อโพสต์", "warning");

    showLoadingModal("กำลังบันทึกการแก้ไข...");
    
    const slots = [];
    
    const planFile = document.getElementById('edit-plan-image-upload')?.files[0];
    const planImage = planFile ? await compressImageToBase64(planFile) : (window.currentPostSlots?.find(s => s.slot_order === 0)?.image1 || "");
    const driveLink = document.getElementById('edit-drive-link').value;

    slots.push({
        slot_id: window.currentTopic0Id || "",
        slot_order: 0,
        question: "ผังหรือแปลนงาน",
        technician_name: "-",
        image1: planImage,
        image2: "",
        image3: "",
        image4: ""
    });

    const topicDivs = document.querySelectorAll('.topic-item');
    for (let div of topicDivs) {
        const order = div.dataset.order;
        const question = div.dataset.question;
        const tech = div.querySelector('.tech-name').value.trim();
        const slotElements = div.querySelectorAll('.image-slot');
        
        const slotData = { 
            slot_id: div.dataset.slotId || "",
            slot_order: parseInt(order), 
            question,
            technician_name: tech,
            image1: "",
            image2: "",
            image3: "",
            image4: ""
        };
        
        for (let i = 0; i < slotElements.length; i++) {
            const slot = slotElements[i];
            const input = slot.querySelector('.slot-input');
            const file = input.files[0];
            const existingImg = slot.querySelector('img:not(.slot-preview img)');
            
            let finalImg = "";
            if (file) {
                finalImg = await compressImageToBase64(file);
            } else if (existingImg && existingImg.src && !slot.dataset.cleared) {
                finalImg = existingImg.src;
            }
            slotData[`image${i+1}`] = finalImg;
        }
        slots.push(slotData);
    }

    const res = await API.updatePost({
        post_id: postId,
        title,
        drive_3d_link: driveLink,
        slots
    });

    hideLoadingModal();
    if (res.success) {
        showNotification("อัปเดตโพสต์สำเร็จ!", "success");
        emitSystemNotification('frontend', 'update_post');
        setTimeout(() => location.href = 'admin_index.html', 1500);
    } else {
        showNotification("ผิดพลาด: " + res.message, "error");
    }
}

async function deletePost(postId) {
    if (!confirm("ยืนยันการลบโพสต์นี้? ข้อมูลทั้งหมดจะหายไปและไม่สามารถกู้คืนได้")) return;

    showLoadingModal("กำลังลบโพสต์...");
    const res = await API.deletePost(postId);
    hideLoadingModal();

    if (res.success) {
        showNotification("ลบโพสต์เรียบร้อยแล้ว", "success");
        initAdminData(false);
    } else {
        showNotification("ลบไม่สำเร็จ: " + res.message, "error");
    }
}
