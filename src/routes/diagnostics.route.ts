/**
 * Diagnostics Route
 * For troubleshooting live server issues
 */

import express, { type Request, type Response } from 'express'
import { exec } from 'child_process'
import { promisify } from 'util'
import { redisClient } from '../config/redis'
import { videoQueue, getQueueStats } from '../config/bull'
import { asyncHandler } from '../middlewares/error-handler'
import { createLogger } from '../utils/logger'

const execAsync = promisify(exec)
const router = express.Router()
const logger = createLogger('DiagnosticsRoute')

/**
 * GET /diagnostics
 * Comprehensive diagnostics for live server troubleshooting
 */
router.get(
  '/diagnostics',
  asyncHandler(async (req: Request, res: Response) => {
    const diagnostics: any = {
      timestamp: new Date().toISOString(),
      environment: {},
      redis: {},
      queue: {},
      system: {},
      python: {},
      workerStatus: {}
    }

    // 1. Environment variables check
    diagnostics.environment = {
      nodeVersion: process.version,
      platform: process.platform,
      cwd: process.cwd(),
      redisHost: process.env.REDIS_HOST || 'localhost',
      redisPort: process.env.REDIS_PORT || '6379',
      redisDb: process.env.REDIS_DB || '0',
      hasRedisPassword: !!process.env.REDIS_PASSWORD,
      hasManimcatKeys: !!process.env.MANIMCAT_ROUTE_KEYS,
      hasManimcatApiKeys: !!process.env.MANIMCAT_ROUTE_API_KEYS
    }

    // 2. Redis connection test
    try {
      const pingResult = await redisClient.ping()
      const info = await redisClient.info('server')
      diagnostics.redis = {
        connected: true,
        ping: pingResult,
        serverInfo: info.split('\n').slice(0, 5).join('\n')
      }
    } catch (error: any) {
      diagnostics.redis = {
        connected: false,
        error: error.message
      }
    }

    // 3. Bull queue diagnostics
    try {
      await videoQueue.isReady()
      const stats = await getQueueStats()
      const isPaused = await videoQueue.isPaused()
      
      // Get sample of waiting jobs
      const waitingJobs = await videoQueue.getWaiting(0, 2)
      const activeJobs = await videoQueue.getActive(0, 2)
      
      diagnostics.queue = {
        ready: true,
        isPaused,
        stats,
        sampleWaitingJobs: waitingJobs.map(j => ({
          id: j.id,
          timestamp: j.timestamp,
          processedOn: j.processedOn,
          finishedOn: j.finishedOn
        })),
        sampleActiveJobs: activeJobs.map(j => ({
          id: j.id,
          timestamp: j.timestamp,
          processedOn: j.processedOn
        }))
      }

      // Check if worker is actually processing
      if (stats.waiting > 0 && stats.active === 0) {
        diagnostics.workerStatus = {
          status: 'NOT_PROCESSING',
          problem: 'Jobs waiting but worker not picking them up',
          possibleCauses: [
            'Worker process not started',
            'videoQueue.process() not called',
            'Worker crashed during initialization'
          ]
        }
      } else if (stats.active > 0) {
        diagnostics.workerStatus = {
          status: 'PROCESSING',
          activeJobs: stats.active
        }
      } else {
        diagnostics.workerStatus = {
          status: 'IDLE',
          message: 'No jobs in queue'
        }
      }
    } catch (error: any) {
      diagnostics.queue = {
        ready: false,
        error: error.message
      }
      diagnostics.workerStatus = {
        status: 'ERROR',
        error: 'Cannot connect to queue'
      }
    }

    // 4. System resources
    try {
      if (process.platform !== 'win32') {
        const { stdout: memInfo } = await execAsync('free -m | grep Mem')
        const memParts = memInfo.trim().split(/\s+/)
        diagnostics.system.memory = {
          total: `${memParts[1]}MB`,
          used: `${memParts[2]}MB`,
          free: `${memParts[3]}MB`
        }

        const { stdout: diskInfo } = await execAsync("df -h / | tail -1")
        const diskParts = diskInfo.trim().split(/\s+/)
        diagnostics.system.disk = {
          size: diskParts[1],
          used: diskParts[2],
          available: diskParts[3],
          usePercent: diskParts[4]
        }
      } else {
        diagnostics.system.message = 'System checks skipped on Windows'
      }
    } catch (error: any) {
      diagnostics.system.error = error.message
    }

    // 5. Python/Manim availability
    try {
      const { stdout: pythonVersion } = await execAsync('python3 --version 2>&1 || python --version 2>&1')
      diagnostics.python.version = pythonVersion.trim()
      diagnostics.python.available = true
    } catch (error: any) {
      diagnostics.python = {
        available: false,
        error: 'Python not found in PATH'
      }
    }

    try {
      const { stdout: manimVersion } = await execAsync('manim --version 2>&1 || python3 -m manim --version 2>&1')
      diagnostics.python.manim = manimVersion.trim().split('\n')[0]
    } catch (error: any) {
      diagnostics.python.manimError = 'Manim not installed or not in PATH'
    }

    try {
      const { stdout: ffmpegVersion } = await execAsync('ffmpeg -version 2>&1 | head -1')
      diagnostics.python.ffmpeg = ffmpegVersion.trim()
    } catch (error: any) {
      diagnostics.python.ffmpegError = 'FFmpeg not installed or not in PATH'
    }

    res.json(diagnostics)
  })
)

export default router
