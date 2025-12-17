const { MongoClient } = require('mongodb');

// Hardcoded URI to test directly
const uri = "mongodb+srv://admin:4hFqPCUq5f8cTpnV@cluster0.wybqdmz.mongodb.net/?appName=Cluster0&authSource=admin";

const client = new MongoClient(uri);

async function run() {
    try {
        console.log("Attempting to connect...");
        await client.connect();
        console.log("Connected successfully to server");
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } catch (e) {
        console.error("Connection failed:", e);
    } finally {
        await client.close();
    }
}

run().catch(console.dir);
