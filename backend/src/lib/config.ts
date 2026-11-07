/** 测试期：信件在途 5 分钟；正式期改为 24 小时只需改这一个值 */
export const TRANSIT_MINUTES = Number(process.env.TRANSIT_MINUTES || 5)

/** 可拆时间 = 寄出时间 + 在途时长 */
export const openTimeFrom = (sentAt: Date) =>
  new Date(sentAt.getTime() + TRANSIT_MINUTES * 60 * 1000)

export const MOODS = ['累', '想被听见', '深夜不睡', '想家', '中年沉默', '刚挂了电话']

export const MAX_BODY = 500

/** 收信等待：信件送达后，收信人须再等这么久才能拆（测试版 15 秒） */
export const RECEIVE_WAIT_SEC = Number(process.env.RECEIVE_WAIT_SEC || 15)

/** 收信可拆时间 = 送达时间 + 收信等待 */
export const openTimeFor = (deliveredAt: Date) =>
  new Date(deliveredAt.getTime() + RECEIVE_WAIT_SEC * 1000)

/** 系统邮差账号，不参与配对 */
export const POSTMAN_CODE = 'POSTM'
