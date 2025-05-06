import type { NextApiRequest, NextApiResponse } from 'next'
import { exec } from 'child_process'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  exec('npx dredd http://mock-server:8080/swagger/swagger.json http://mock-server:8080 --reporter progress', {
    cwd: process.cwd(),
    maxBuffer: 10 * 1024 * 1024, // 必要に応じてバッファ調整
  }, (err, stdout, stderr) => {
    if (err && (err as any).code !== 0) {
      res.status(500).json({ ok: false, error: stderr || err.message })
    } else {
      res.status(200).json({ ok: true, output: stdout })
    }
  })
}
