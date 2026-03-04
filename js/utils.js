const ITEMS_PER_PAGE = 6;

function showNotification(message, type = 'info') {
  // Create a toast notification
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerText = message;
  
  container.appendChild(toast);
  
  // Trigger animation (reflow)
  void toast.offsetWidth;
  toast.classList.add('show');
  
  // Remove after 3s
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Convert File to Base64 (WebP, resizing image to strictly under 50KB)
async function compressImageToBase64(file, maxWidth = 800, maxHeight = 800, quality = 0.7) {
  if (!file) return null;

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = async () => {
        let currentWidth = img.width;
        let currentHeight = img.height;
        let currentQuality = quality;
        let finalBase64 = null;
        
        // Iteratively compress until size < 50KB (approx 50,000 characters in base64 is ~37KB, but let's aim for safety)
        // Google Sheet cell limit is ~50,000 characters.
        const MAX_CHARS = 48000; 

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // Initial Resize
        if (currentWidth > currentHeight) {
          if (currentWidth > maxWidth) {
            currentHeight = Math.round((currentHeight * maxWidth) / currentWidth);
            currentWidth = maxWidth;
          }
        } else {
          if (currentHeight > maxHeight) {
            currentWidth = Math.round((currentWidth * maxHeight) / currentHeight);
            currentHeight = maxHeight;
          }
        }

        while (true) {
          canvas.width = currentWidth;
          canvas.height = currentHeight;
          ctx.clearRect(0, 0, currentWidth, currentHeight);
          ctx.drawImage(img, 0, 0, currentWidth, currentHeight);

          finalBase64 = canvas.toDataURL('image/webp', currentQuality);

          if (finalBase64.length < MAX_CHARS || currentQuality < 0.2) {
            break;
          }

          // Reduce quality and size if still too big
          currentQuality -= 0.1;
          if (currentQuality < 0.4) {
             currentWidth = Math.round(currentWidth * 0.8);
             currentHeight = Math.round(currentHeight * 0.8);
          }
        }
        
        console.log(`Compressed image size: ${finalBase64.length} chars`);
        resolve(finalBase64);
      };
    };
  });
}

// Setup simple modal for image preview
function previewImage(base64Str) {
  if (!base64Str) return;
  
  let modal = document.getElementById('image-preview-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'image-preview-modal';
    modal.className = 'modal-backdrop';
    
    const imgContainer = document.createElement('div');
    imgContainer.className = 'modal-content image-modal-content';
    
    const closeBtn = document.createElement('span');
    closeBtn.className = 'close-btn';
    closeBtn.innerHTML = '&times;';
    closeBtn.onclick = () => {
      modal.style.display = 'none';
      img.src = '';
    };
    
    const img = document.createElement('img');
    img.id = 'preview-target-img';
    
    imgContainer.appendChild(closeBtn);
    imgContainer.appendChild(img);
    modal.appendChild(imgContainer);
    document.body.appendChild(modal);
    
    // Close on backdrop click
    modal.onclick = (e) => {
      if (e.target === modal) {
        modal.style.display = 'none';
        img.src = '';
      }
    };
  }
  
  document.getElementById('preview-target-img').src = base64Str;
  modal.style.display = 'flex';
}

// System Notification Simulation for Localhost / Github Testing
function emitSystemNotification(target = 'frontend', action = 'new_post') {
  localStorage.setItem(`sys_notify_${target}`, JSON.stringify({ action, timestamp: Date.now() }));
}

function listenSystemNotification(target = 'frontend', callback) {
  window.addEventListener('storage', (e) => {
    if (e.key === `sys_notify_${target}`) {
      const data = JSON.parse(e.newValue);
      if(data) callback(data.action);
    }
  });
}

// Global Loading Modal
function showLoadingModal(message = "กำลังโหลดข้อมูล...") {
  let modal = document.getElementById('global-loading-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'global-loading-modal';
    modal.className = 'fixed inset-0 flex items-center justify-center z-[9999] opacity-0 pointer-events-none transition-all duration-300';
    
    // Backdrop blur
    const backdrop = document.createElement('div');
    backdrop.className = 'absolute inset-0 bg-slate-900/40 backdrop-blur-md';
    modal.appendChild(backdrop);
    
    const content = document.createElement('div');
    content.className = 'relative bg-white rounded-[2.5rem] p-10 shadow-2xl border-4 border-white flex flex-col items-center max-w-[320px] w-[90%] transform scale-90 transition-all duration-300';
    
    // Cute Spinner with Gradient
    const spinnerContainer = document.createElement('div');
    spinnerContainer.className = 'relative w-24 h-24 mb-8';
    
    const spinner = document.createElement('div');
    spinner.className = 'w-full h-full rounded-full border-[6px] border-slate-100 border-t-blue-600 animate-spin shadow-inner';
    
    const icon = document.createElement('div');
    icon.className = 'absolute inset-0 flex items-center justify-center text-3xl animate-pulse';
    icon.innerText = '🏠'; // Cute house icon for architecture
    
    spinnerContainer.appendChild(spinner);
    spinnerContainer.appendChild(icon);
    
    const text = document.createElement('p');
    text.id = 'global-loading-text';
    text.className = 'text-xl font-black text-slate-800 text-center tracking-tight';
    
    const subtext = document.createElement('p');
    subtext.className = 'text-slate-400 text-sm font-bold mt-2 uppercase tracking-widest';
    subtext.innerText = 'โปรดรอสักครู่';

    content.appendChild(spinnerContainer);
    content.appendChild(text);
    content.appendChild(subtext);
    modal.appendChild(content);
    document.body.appendChild(modal);
  }
  
  const textEl = document.getElementById('global-loading-text');
  if (textEl) textEl.innerText = message;
  
  // Trigger animations
  setTimeout(() => {
    modal.classList.remove('opacity-0', 'pointer-events-none', 'hidden');
    modal.classList.add('flex'); // Ensure it's visible
    const content = modal.querySelector('.relative');
    if (content) {
        content.classList.remove('scale-90');
        content.classList.add('scale-100');
    }
  }, 10);
}

function hideLoadingModal() {
  const modal = document.getElementById('global-loading-modal');
  if (modal) {
    modal.classList.add('opacity-0', 'pointer-events-none');
    const content = modal.querySelector('.relative');
    if (content) {
        content.classList.remove('scale-100');
        content.classList.add('scale-90');
    }
    setTimeout(() => {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }, 300);
  }
}

// Global Confirm Modal
function showConfirmModal(title, message, onConfirm) {
  let modal = document.getElementById('global-confirm-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'global-confirm-modal';
    modal.className = 'fixed inset-0 flex items-center justify-center z-[9999] opacity-0 pointer-events-none transition-all duration-300';
    
    const backdrop = document.createElement('div');
    backdrop.className = 'absolute inset-0 bg-slate-900/40 backdrop-blur-md';
    modal.appendChild(backdrop);
    
    const content = document.createElement('div');
    content.className = 'relative bg-white rounded-[2.5rem] p-10 shadow-2xl border-4 border-white flex flex-col items-center max-w-[400px] w-[90%] transform scale-90 transition-all duration-300';
    
    const icon = document.createElement('div');
    icon.className = 'w-20 h-20 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center text-4xl mb-6 shadow-inner';
    icon.innerText = '❓';
    
    const titleEl = document.createElement('h3');
    titleEl.id = 'confirm-modal-title';
    titleEl.className = 'text-2xl font-black text-slate-800 text-center mb-2';
    
    const textEl = document.createElement('p');
    textEl.id = 'confirm-modal-text';
    textEl.className = 'text-slate-500 text-center font-medium mb-8';
    
    const btnContainer = document.createElement('div');
    btnContainer.className = 'flex gap-4 w-full';
    
    const cancelBtn = document.createElement('button');
    cancelBtn.id = 'confirm-modal-cancel';
    cancelBtn.className = 'flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-2xl transition-all';
    cancelBtn.innerText = 'ยกเลิก';
    
    const okBtn = document.createElement('button');
    okBtn.id = 'confirm-modal-ok';
    okBtn.className = 'flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-lg shadow-blue-200 transition-all hover:-translate-y-1';
    okBtn.innerText = 'ยืนยัน';
    
    btnContainer.appendChild(cancelBtn);
    btnContainer.appendChild(okBtn);
    
    content.appendChild(icon);
    content.appendChild(titleEl);
    content.appendChild(textEl);
    content.appendChild(btnContainer);
    
    modal.appendChild(content);
    document.body.appendChild(modal);
  }
  
  document.getElementById('confirm-modal-title').innerText = title;
  document.getElementById('confirm-modal-text').innerText = message;
  
  const okBtn = document.getElementById('confirm-modal-ok');
  const cancelBtn = document.getElementById('confirm-modal-cancel');
  
  const newOkBtn = okBtn.cloneNode(true);
  const newCancelBtn = cancelBtn.cloneNode(true);
  okBtn.parentNode.replaceChild(newOkBtn, okBtn);
  cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
  
  const closeModal = () => {
    modal.classList.add('opacity-0', 'pointer-events-none');
    modal.querySelector('.relative').classList.remove('scale-100');
    modal.querySelector('.relative').classList.add('scale-90');
    setTimeout(() => { modal.classList.add('hidden'); modal.classList.remove('flex'); }, 300);
  };

  newCancelBtn.onclick = closeModal;
  newOkBtn.onclick = () => {
    closeModal();
    if(onConfirm) onConfirm();
  };
  
  modal.classList.remove('hidden', 'opacity-0', 'pointer-events-none');
  modal.classList.add('flex');
  setTimeout(() => {
    modal.querySelector('.relative').classList.remove('scale-90');
    modal.querySelector('.relative').classList.add('scale-100');
  }, 10);
}
