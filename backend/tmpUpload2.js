const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: 'dysrjp0dg',
  api_key: '357457344954416',
  api_secret: '_rjx0Sn2wnWjlPTGYxejzsQTtQU'
});

cloudinary.uploader.upload('c:\\Users\\dibya\\OneDrive\\Desktop\\GuardianSOS\\WhatsApp Image 2026-03-21 at 2.37.50 PM.jpeg',
  { folder: 'guardiansos/email_assets' },
  function (error, result) {
    if (error) {
      console.error(error);
    } else {
      require('fs').writeFileSync('tmpOutput2.txt', result.secure_url);
    }
  }
);
