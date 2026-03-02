

async function runTest() {
    try {
        console.log("Starting E2E Test...");
        const email = `test_chat_${Date.now()}@example.com`;

        // 1. Register User
        console.log(`Registering user ${email}...`);
        const regRes = await fetch("http://localhost:3001/auth/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password: "Password123!", role: "developer" })
        });

        let token;
        if (regRes.ok) {
            const data = await regRes.json();
            token = data.access_token;
            console.log("Registration successful.");
        } else {
            // Try login if exist
            console.log("Registration failed, trying login...");
            const loginRes = await fetch("http://localhost:3001/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password: "Password123!" })
            });
            const data = await loginRes.json();
            token = data.access_token;
            console.log("Login successful.");
        }

        // 2. Create Goal
        console.log("Creating Goal...");
        const goalRes = await fetch("http://localhost:3002/goals", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ title: "Master DevOps with Subagents", tasks: ["Setup Docker", "Configure Kafka"] })
        });
        const goal = await goalRes.json();
        console.log(`Goal Created: ${goal.title}, ID: ${goal.id}`);
        const firstTaskId = goal.tasks[0].id;

        // 3. Complete Task
        console.log(`Completing task: ${goal.tasks[0].title} (${firstTaskId})...`);
        const compRes = await fetch(`http://localhost:3002/goals/tasks/${firstTaskId}/complete`, {
            method: "PATCH",
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (compRes.ok) {
            console.log("Task marked as completed! Kafka event should be emitted.");
        }

        // 4. Wait for AI to process message
        console.log("Waiting 15 seconds for Kafka and Gemini processing...");
        await new Promise(r => setTimeout(r, 15000));

        // 5. Ask Chat API
        console.log("Asking AI Chat API...");
        const chatRes = await fetch("http://localhost:8000/chat", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ message: "What tasks did I finish recently?" })
        });

        if (!chatRes.ok) {
            console.log("Chat failed", chatRes.status, await chatRes.text());
        } else {
            const reply = await chatRes.json();
            console.log("\n====== AI RESPONSE ======");
            console.log(reply.reply);
            console.log("=========================\n");
        }

    } catch (err) {
        console.error("Test failed:", err);
    }
}

runTest();
