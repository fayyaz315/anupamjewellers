require("dotenv").config()
const fs = require("fs")
const path = require("path")
const SftpClient = require("ssh2-sftp-client")
const sftp = new SftpClient()

const LOCAL_DIR = path.join(__dirname, "downloads")

const deleteLocalZipFiles = () => {
    if (!fs.existsSync(LOCAL_DIR)) return

    const files = fs.readdirSync(LOCAL_DIR)
    for (const file of files) {
        if (file.endsWith(".zip")) {
            const filePath = path.join(LOCAL_DIR, file)
            fs.unlinkSync(filePath)
            console.log(`🗑️ Deleted local file: ${filePath}`)
        }
    }
}

const deleteRemoteZipFiles = async () => {
    const remoteDir = process.env.FTP_DIRECTORY.trim().replace(/\\/g, "/")

    try {
        await sftp.connect({
            host: process.env.FTP_HOST,
            port: Number(process.env.FTP_PORT),
            username: process.env.FTP_USERNAME,
            password: process.env.FTP_PASSWORD
        })

        const fileList = await sftp.list(remoteDir)
        const zipFiles = fileList.filter(file => file.name.endsWith(".zip"))

        for (const file of zipFiles) {
            const remotePath = `${remoteDir}/${file.name}`
            await sftp.delete(remotePath)
            console.log(`🗑️ Deleted remote file: ${remotePath}`)
        }

    } catch (error) {
        console.error("❌ SFTP Cleanup Error:", error.message)
    } finally {
        sftp.end()
    }
}

const cleanupZips = async () => {
    deleteLocalZipFiles()
    await deleteRemoteZipFiles()
}

module.exports = { cleanupZips }
