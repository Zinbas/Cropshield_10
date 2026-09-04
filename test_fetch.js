fetch("http://127.0.0.1:3000/api/trpc/auth.me").then(res => res.text()).then(t => console.log("Response:", t)).catch(e => console.error("Error:", e));
