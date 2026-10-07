const exprees = require("express");
const app = exprees();

//API without database
// no endpoint is required to connect with database, we can just send the data in json format
app.get("/",(req,res)=>{
    res.send("Backend is running");
});

// API to get users
app.get("/users", (req, res) => {
    res.json([
        { id: 1, name: "John" },
        { id: 2, name: "Alex" }
    ]);
});

// API to post users
app.post("/users", (req, res) => {
    const user = req.body;
    res.json({
        message: "User created",
        data: user
    });
});

//Async and await example
const getData = async () => {
    return "Hello";
};

app.get("/test", async (req, res) => {
    const data = await getData();
    res.send(data);
});

app.listen(5000, () => {
    console.log("Server running on port 5000");
});
