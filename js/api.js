const API_URL = "https://script.google.com/macros/s/AKfycbyClNVmzrLdp4x_PUZCrZb4IWWS3Q8wMjbUgmMy1lnqeOvw4amgAbmHL7mTGxysOiaEHQ/exec";

async function apiRequest(action, payload = null) {
  try {
    // ถ้าเป็น GET request ให้แนบ parameter ไปกับ URL
    let url = API_URL;
    let options = {
      method: action.startsWith('get') ? 'GET' : 'POST',
      redirect: "follow",
    };

    if (action.startsWith('get')) {
      const params = new URLSearchParams({ action });
      if (payload) {
        for (const key in payload) {
          params.append(key, payload[key]);
        }
      }
      url = `${API_URL}?${params.toString()}`;
    } else {
      // ถ้าเป็น POST request
      options.body = JSON.stringify({ action, ...payload });
      // ใช้ text/plain เพื่อเลี่ยงปัญหาระหว่าง preflight CORS ใน Google Apps Script
      options.headers = { 'Content-Type': 'text/plain;charset=utf-8' };
    }

    if (API_URL.includes("YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE")) {
      console.error("API_URL is not set! กรุณาใส่ Web App URL ใน js/api.js");
      return { success: false, message: "API URL ยังไม่ได้ถูกตั้งค่า" };
    }

    const response = await fetch(url, options);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`API Error (${action}):`, error);
    return { success: false, message: error.message };
  }
}

const API = {
  getPosts: () => apiRequest('getPosts'),
  getPostDetail: (post_id) => apiRequest('getPostDetail', { post_id }),
  createPost: (data) => apiRequest('createPost', data),
  updatePost: (data) => apiRequest('updatePost', data),
  deletePost: (post_id) => apiRequest('deletePost', { post_id }),
  saveInspection: (data) => apiRequest('saveInspection', data),
};
