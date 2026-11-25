// 读取图片文件：小图原样返回，大图用 canvas 压缩成 JPEG，避免 9 张图撑爆请求和数据库
export function readImageFile(file, options) {
  const opts = options || {};
  const maxSize = opts.maxSize || 1600;
  const quality = opts.quality || 0.82;
  const maxBytes = opts.maxBytes || 5 * 1024 * 1024;
  const maxInputBytes = opts.maxInputBytes || 15 * 1024 * 1024;

  return new Promise(function (resolve, reject) {
    if (!file) return reject(new Error('没有选择图片'));
    if (!/^image\//.test(file.type)) return reject(new Error('只能选择图片文件'));
    if (file.size > maxInputBytes) return reject(new Error('图片太大，请换一张'));

    // 服务端只接受这四种；小图/GIF 原样上传，其他格式（SVG/BMP/AVIF/HEIC 等）走 canvas 转 JPEG
    const passthrough = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (passthrough.indexOf(file.type) !== -1 && (file.type === 'image/gif' || file.size <= 1.5 * 1024 * 1024)) {
      if (file.size > maxBytes) return reject(new Error('图片不能超过 5MB'));
      const r = new FileReader();
      r.onload = function () { resolve(r.result); };
      r.onerror = function () { reject(new Error('图片读取失败')); };
      r.readAsDataURL(file);
      return;
    }

    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = function () {
      URL.revokeObjectURL(url);
      let w = img.width;
      let h = img.height;
      if (w > maxSize || h > maxSize) {
        const k = Math.min(maxSize / w, maxSize / h);
        w = Math.round(w * k);
        h = Math.round(h * k);
      }
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = function () {
      URL.revokeObjectURL(url);
      reject(new Error('图片读取失败'));
    };
    img.src = url;
  });
}
