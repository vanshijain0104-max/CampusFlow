/**
 * Test authentication across all 5 student credentials
 */

async function testStudentAuth() {
  const credentials = [
    { name: "Priya Singh", roll: "241H0320145", pass: "PRIYA" },
    { name: "Ananya Sharma", roll: "241H0320188", pass: "ANANYA" },
    { name: "Sneha Verma", roll: "241H0320215", pass: "SNEHA" },
    { name: "Kavya Joshi", roll: "241H0320245", pass: "KAVYA" },
    { name: "Megha Gupta", roll: "241H0320278", pass: "MEGHA" },
  ];

  console.log("Testing Student Authentication against NextAuth endpoint...\n");

  for (const cred of credentials) {
    // 1. Fetch CSRF token from NextAuth
    const csrfRes = await fetch("http://localhost:3000/api/auth/csrf");
    const csrfData = await csrfRes.json();
    const csrfToken = csrfData.csrfToken;
    const cookies = csrfRes.headers.get("set-cookie") || "";

    // 2. Post credentials
    const authRes = await fetch("http://localhost:3000/api/auth/callback/credentials", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Cookie: cookies,
      },
      body: new URLSearchParams({
        csrfToken,
        identifier: cred.roll,
        password: cred.pass,
        json: "true",
      }).toString(),
      redirect: "manual",
    });

    console.log(`Checking ${cred.name.padEnd(15)} (Roll: ${cred.roll} | Pass: ${cred.pass}) -> Status: ${authRes.status}`);
    const location = authRes.headers.get("location") || "";
    if (location.includes("error=CredentialsSignin")) {
      console.error(`  ❌ Failed to authenticate ${cred.name}`);
    } else {
      console.log(`  ✅ Success! Authenticated.`);
    }
  }
}

testStudentAuth().catch(console.error);
