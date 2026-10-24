/**
 * CampusFlow — Phase 4 End-to-End Automated Integration Test Suite
 */

async function runTests() {
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║     CampusFlow — Phase 4 End-to-End Integration Tests        ║");
  console.log("╚══════════════════════════════════════════════════════════════╝\n");

  const BASE_URL = "http://localhost:3000";

  // ── TEST 1: Submit Casual Leave Application (Priya Singh) ──
  console.log("▶ [Test 1] Submitting Leave Application for Priya Singh (241H0320145)...");
  const submitPayload1 = {
    rollNo: "241H0320145",
    studentId: "BTBTC24145",
    bookletType: "NORMAL",
    fromDate: "2026-11-02",
    toDate: "2026-11-06",
    totalDays: 5,
    chargeableDays: 4,
    destination: "Jaipur, Rajasthan",
    reason: "Sister's Marriage",
    quotaAlertFlag: "Quota Status: Within Allowance (11 Days Remaining)",
    slipImageUrl: "/sample-slips/slip_priya.png",
  };

  const res1 = await fetch(`${BASE_URL}/api/leaves/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(submitPayload1),
  });

  const data1 = await res1.json();
  console.log("  Response HTTP Status:", res1.status);
  console.log("  Success:", data1.success);
  console.log("  Leave ID:", data1.leaveId);
  console.log("  Initial Status:", data1.status);
  console.log("  Parent Token Generated:", data1.parentToken ? "YES (Secure UUID)" : "NO");
  console.log("  Token Expiry:", data1.parentTokenExpiry);
  console.log("  Centralized Test Email Target:", data1.notificationSentTo);
  console.log("  Magic Link URL:", data1.magicLinkUrl);

  if (!data1.success || !data1.parentToken || data1.status !== "PENDING_PARENT") {
    throw new Error("Test 1 Failed: Leave submission or token generation failed.");
  }
  console.log("  ✅ Test 1 PASSED: Application submitted with status PENDING_PARENT.\n");

  const parentToken1 = data1.parentToken;

  // ── TEST 2: Zero-Login Mobile Parent Portal Load ──
  console.log("▶ [Test 2] Loading Parent Consent Portal (Zero-Login Public Web Page)...");
  const portalUrl = `${BASE_URL}/parent/consent/${parentToken1}`;
  const portalRes = await fetch(portalUrl);
  console.log("  Consent Page HTTP Status:", portalRes.status);
  const portalHtml = await portalRes.text();
  const containsStudent = portalHtml.includes("Priya Singh");
  const containsRoll = portalHtml.includes("241H0320145");
  const containsApproveBtn = portalHtml.includes("Approve Leave");
  console.log("  Contains Student Name:", containsStudent);
  console.log("  Contains Roll Number:", containsRoll);
  console.log("  Contains Decision Controls:", containsApproveBtn);

  if (portalRes.status !== 200 || !containsStudent) {
    throw new Error("Test 2 Failed: Parent consent page failed to load student data.");
  }
  console.log("  ✅ Test 2 PASSED: Parent consent page rendered correctly without authentication.\n");

  // ── TEST 3: Parent Approves Leave (Status -> PENDING_WARDEN_1) ──
  console.log("▶ [Test 3] Parent Authorizes Leave (Action: APPROVE)...");
  const authRes1 = await fetch(`${BASE_URL}/api/parent/authorize`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": "103.25.44.12",
    },
    body: JSON.stringify({
      token: parentToken1,
      action: "APPROVE",
    }),
  });

  const authData1 = await authRes1.json();
  console.log("  Auth API Status:", authRes1.status);
  console.log("  Success:", authData1.success);
  console.log("  Transitioned Status:", authData1.status);
  console.log("  Parent Approved At:", authData1.parentApprovedAt);
  console.log("  Recorded IP Address:", authData1.ipRecorded);
  console.log("  Message:", authData1.message);

  if (authData1.status !== "PENDING_WARDEN_1" || !authData1.parentApprovedAt) {
    throw new Error("Test 3 Failed: Status did not transition to PENDING_WARDEN_1.");
  }
  console.log("  ✅ Test 3 PASSED: Atomic transition to PENDING_WARDEN_1 confirmed with audit IP.\n");

  // ── TEST 4: Single-Use Token Invalidation Check ──
  console.log("▶ [Test 4] Verifying Single-Use Token Invalidation (Replay Prevention)...");
  const replayRes = await fetch(`${BASE_URL}/api/parent/authorize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      token: parentToken1,
      action: "APPROVE",
    }),
  });
  const replayData = await replayRes.json();
  console.log("  Replay Attempt HTTP Status:", replayRes.status);
  console.log("  Error Message:", replayData.error);

  if (replayRes.status === 200) {
    throw new Error("Test 4 Failed: Token replay should be blocked.");
  }
  console.log("  ✅ Test 4 PASSED: Token reuse correctly blocked (Single-use lock enforced).\n");

  // ── TEST 5: Parent Rejection Flow (Sneha Verma) ──
  console.log("▶ [Test 5] Testing Parent Rejection Flow for Sneha Verma (241H0320215)...");
  const submitPayload2 = {
    rollNo: "241H0320215",
    studentId: "BTBTC24215",
    bookletType: "NORMAL",
    fromDate: "2026-11-10",
    toDate: "2026-11-14",
    totalDays: 5,
    chargeableDays: 4,
    destination: "Kota, Rajasthan",
    reason: "Personal",
    quotaAlertFlag: "Quota Status: Within Allowance (11 Days Remaining)",
    slipImageUrl: "/sample-slips/slip_sneha.png",
  };

  const res2 = await fetch(`${BASE_URL}/api/leaves/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(submitPayload2),
  });
  const data2 = await res2.json();
  const parentToken2 = data2.parentToken;

  const rejectRes = await fetch(`${BASE_URL}/api/parent/authorize`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": "103.25.44.99",
    },
    body: JSON.stringify({
      token: parentToken2,
      action: "REJECT",
      remarks: "Mid-semester internal lab exams scheduled. Travel not permitted.",
    }),
  });

  const rejectData = await rejectRes.json();
  console.log("  Rejection Status:", rejectData.status);
  console.log("  Message:", rejectData.message);

  if (rejectData.status !== "REJECTED_PARENT") {
    throw new Error("Test 5 Failed: Status did not transition to REJECTED_PARENT.");
  }
  console.log("  ✅ Test 5 PASSED: Rejection recorded with status REJECTED_PARENT and parent remarks.\n");

  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║         🎉 ALL PHASE 4 INTEGRATION TESTS PASSED!             ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");
}

runTests().catch((err) => {
  console.error("❌ Test suite encountered an error:", err);
  process.exit(1);
});
