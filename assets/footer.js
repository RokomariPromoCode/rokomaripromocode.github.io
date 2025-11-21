document.addEventListener('DOMContentLoaded', function(){
  const form = document.getElementById('footer-request-form');
  const result = document.getElementById('footer-request-result');

  if (!form) return;
  form.addEventListener('submit', async function(e){
    e.preventDefault();
    const data = new FormData(form);
    const payload = {
      name: data.get('name'),
      contact: data.get('contact'),
      product: data.get('product')
    };

    result.style.display = 'block';
    result.textContent = 'পাঠানো হচ্ছে...';

    try {
      const res = await fetch('/.netlify/functions/sendMail', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify(payload)
      });

      const json = await res.json();
      if (res.ok) {
        result.textContent = 'আপনার রিকোয়েস্ট পাঠানো হয়েছে — ধন্যবাদ!';
        form.reset();
      } else {
        result.textContent = json && json.error ? ('ত্রুটি: ' + json.error) : 'পাঠাতে সমস্যা হয়েছে। পরে আবার চেষ্টা করুন।';
      }
    } catch(err) {
      console.error(err);
      result.textContent = 'নেটে সমস্যা— পরে চেষ্টা করুন।';
    }

    setTimeout(()=> result.style.display='none', 7000);
  });
});
