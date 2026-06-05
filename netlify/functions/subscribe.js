exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }
  let body;
  try { body = JSON.parse(event.body || "{}"); }
  catch { return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON" }) }; }
  const { prenom, email, profil } = body;
  if (!email || !prenom) {
    return { statusCode: 400, body: JSON.stringify({ error: "Missing prenom or email" }) };
  }
  const API_KEY = process.env.MAILERLITE_API_KEY;
  if (!API_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: "Server config error" }) };
  }
  const HEADERS = {
    "Content-Type": "application/json",
    "Accept": "application/json",
    "Authorization": `Bearer ${API_KEY}`,
  };
  let groupId = null;
  try {
    const groupsRes = await fetch("https://connect.mailerlite.com/api/groups?limit=100", { headers: HEADERS });
    const groupsData = await groupsRes.json();
    const allGroups = groupsData?.data || [];
    const match = allGroups.find((g) => g.name.toLowerCase().trim() === profil.toLowerCase().trim());
    if (match) groupId = match.id;
  } catch (err) {}
  try {
    const payload = {
      email: email.toLowerCase().trim(),
      fields: { name: prenom },
      groups: groupId ? [groupId] : [],
      status: "active",
      resubscribe: true,
    };
    const subRes = await fetch("https://connect.mailerlite.com/api/subscribers", {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify(payload),
    });
    const subData = await subRes.json();
    if (!subRes.ok) {
      return { statusCode: subRes.status, body: JSON.stringify({ error: "MailerLite error", detail: subData }) };
    }
    return { statusCode: 200, body: JSON.stringify({ success: true, groupId }) };
  } catch (err) {
    return { statusCode: 502, body: JSON.stringify({ error: "Network error" }) };
  }
};
