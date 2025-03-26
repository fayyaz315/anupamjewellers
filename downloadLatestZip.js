require("dotenv").config()
const fs = require("fs")
const path = require("path")
const SftpClient = require("ssh2-sftp-client")
const AdmZip = require("adm-zip")

const sftp = new SftpClient()

const LOCAL_DOWNLOAD_DIR = path.join(__dirname, "downloads")
if (!fs.existsSync(LOCAL_DOWNLOAD_DIR)) {
    fs.mkdirSync(LOCAL_DOWNLOAD_DIR)
}

const downloadLatestZip = async () => {
    try {
        await sftp.connect({
            host: process.env.FTP_HOST,
            port: Number(process.env.FTP_PORT),
            username: process.env.FTP_USERNAME,
            password: process.env.FTP_PASSWORD
        })

        const remoteDir = process.env.FTP_DIRECTORY.trim().replace(/\\/g, "/")
        const fileList = await sftp.list(remoteDir)

        const zipFiles = fileList
            .filter(f => f.type === '-' && f.name.endsWith(".zip"))
            .sort((a, b) => b.modifyTime - a.modifyTime)

        if (zipFiles.length === 0) {
            console.log("❌ No .zip files found.")
            return
        }

        const latestFile = zipFiles[0]
        const remotePath = `${remoteDir}/${latestFile.name}`
        const localPath = path.join(LOCAL_DOWNLOAD_DIR, latestFile.name)

        console.log(`📥 Downloading ${latestFile.name} from ${remotePath}...`)
        await sftp.fastGet(remotePath, localPath)
        console.log("✅ Download complete:", localPath)

        const zip = new AdmZip(localPath)
        const unzipPath = path.join(LOCAL_DOWNLOAD_DIR, "unzipped")
        zip.extractAllTo(unzipPath, true)
        console.log("✅ Unzipped to:", unzipPath)

    } catch (err) {
        console.error("❌ SFTP Error:", err.message)
    } finally {
        sftp.end()
    }
}

module.exports = { downloadLatestZip }