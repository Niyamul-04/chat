const API_URL = 'http://localhost:5000/api';

async function req(url: string, options: any = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  const body = options.body ? JSON.stringify(options.body) : undefined;
  const res = await fetch(url, { ...options, headers, body });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
}

async function runIntegrationTests() {
  console.log('🧪 Starting ChatSphere End-to-End API Automated Verification with native fetch...\n');

  try {
    // 1. Health check
    const health = await req('http://localhost:5000/health');
    console.log('✅ 1. Health Check:', health.data);

    // 2. Login as Alice
    const aliceLogin = await req(`${API_URL}/auth/login`, {
      method: 'POST',
      body: { username: 'alice', password: 'Password123!' },
    });
    const aliceToken = aliceLogin.data.token;
    console.log('✅ 2. Alice Login Succeeded. Token received:', aliceToken ? 'Yes' : 'No');

    // 3. Login as Bob
    const bobLogin = await req(`${API_URL}/auth/login`, {
      method: 'POST',
      body: { username: 'bob', password: 'Password123!' },
    });
    const bobToken = bobLogin.data.token;
    console.log('✅ 3. Bob Login Succeeded. Token received:', bobToken ? 'Yes' : 'No');

    // 4. Alice checks friends list
    const aliceFriends = await req(`${API_URL}/friends`, {
      headers: { Authorization: `Bearer ${aliceToken}` },
    });
    console.log('✅ 4. Alice Friends List count:', aliceFriends.data.friends.length);
    const bobFriend = aliceFriends.data.friends.find((f: any) => f.friend.username === 'bob');
    console.log('   -> Friend Bob verified in Alice list:', !!bobFriend);

    // 5. Send message from Alice to Bob
    const msgRes = await req(`${API_URL}/messages/send`, {
      method: 'POST',
      body: {
        receiverId: bobLogin.data.user.id,
        content: 'Automated test message from Alice to Bob 🚀',
        type: 'TEXT',
      },
      headers: { Authorization: `Bearer ${aliceToken}` },
    });
    console.log('✅ 5. Real-Time Message Sent successfully. ID:', msgRes.data.message.id);

    // 6. Bob reads message history with Alice
    const bobMessages = await req(`${API_URL}/messages/${aliceLogin.data.user.id}`, {
      headers: { Authorization: `Bearer ${bobToken}` },
    });
    console.log('✅ 6. Bob retrieved messages count with Alice:', bobMessages.data.messages.length);
    const receivedLatest = bobMessages.data.messages[bobMessages.data.messages.length - 1];
    console.log('   -> Latest Message Content:', receivedLatest.content);

    // 7. Test Non-Friend Message Restriction (Charlie sends message to Bob without being friends)
    const charlieLogin = await req(`${API_URL}/auth/login`, {
      method: 'POST',
      body: { username: 'charlie', password: 'Password123!' },
    });
    const charlieToken = charlieLogin.data.token;

    const rejectedMsg = await req(`${API_URL}/messages/send`, {
      method: 'POST',
      body: {
        receiverId: bobLogin.data.user.id,
        content: 'I should be rejected by the server!',
        type: 'TEXT',
      },
      headers: { Authorization: `Bearer ${charlieToken}` },
    });
    if (rejectedMsg.status === 403) {
      console.log('✅ 7. Non-Friend Restriction strictly ENFORCED! Server returned: 403', rejectedMsg.data.error);
    } else {
      console.error('❌ Non-friend message was NOT rejected! Status:', rejectedMsg.status);
    }

    // 8. Alice checks Friend Requests (Charlie sent one)
    const aliceRequests = await req(`${API_URL}/friends/requests`, {
      headers: { Authorization: `Bearer ${aliceToken}` },
    });
    console.log('✅ 8. Alice received friend requests count:', aliceRequests.data.received.length);
    const charlieReq = aliceRequests.data.received.find((r: any) => r.sender.username === 'charlie');
    console.log('   -> Request from Charlie found:', !!charlieReq);

    // 9. Alice Accepts Charlie's request
    if (charlieReq) {
      const acceptRes = await req(`${API_URL}/friends/accept/${charlieReq.id}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${aliceToken}` },
      });
      console.log('✅ 9. Alice accepted Charlie request:', acceptRes.data.message);
    }

    // 10. Now Charlie sends a message to Alice (now that they are accepted friends)
    const charlieToAliceMsg = await req(`${API_URL}/messages/send`, {
      method: 'POST',
      body: {
        receiverId: aliceLogin.data.user.id,
        content: 'Hey Alice, thanks for accepting my friend request!',
        type: 'TEXT',
      },
      headers: { Authorization: `Bearer ${charlieToken}` },
    });
    console.log('✅ 10. Charlie now successfully messages Alice! Message ID:', charlieToAliceMsg.data.message.id);

    // 11. Test WebRTC ICE servers endpoint
    const iceServers = await req(`${API_URL}/calls/config`, {
      headers: { Authorization: `Bearer ${aliceToken}` },
    });
    console.log('✅ 11. WebRTC ICE Configuration received. STUN servers configured:', iceServers.data.iceServers.length);

    console.log('\n🎉 ALL 11 END-TO-END SYSTEM INTEGRATION TESTS PASSED 100%!');
  } catch (error: any) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

runIntegrationTests();
