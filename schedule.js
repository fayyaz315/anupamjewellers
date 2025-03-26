const { requestProductCSVToFTP } = require("./requestCSV")

const runJob = async () => {
    console.log(`🕒 Running job at ${new Date().toLocaleString()}`)
    await requestProductCSVToFTP()
}

runJob() // Run immediately
setInterval(runJob, 30 * 60 * 1000) // Every 30 minutes
