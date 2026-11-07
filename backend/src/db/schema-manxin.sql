-- 慢信 Slow Letter
-- 匿名书信交换：昵称 + 恢复码，不绑手机号
-- 注意：本文件在每次启动时执行，必须完全幂等，禁止出现 DROP TABLE


-- 用户（匿名）
CREATE TABLE IF NOT EXISTS members (
  id           SERIAL PRIMARY KEY,
  nickname     TEXT NOT NULL,
  recover_code TEXT UNIQUE NOT NULL,          -- 大写无歧义字符，用于找回身份
  code_hint    TEXT NOT NULL DEFAULT '',      -- 生成时展示的前 4 位，方便用户确认
  moods        TEXT[] NOT NULL DEFAULT '{}',  -- 3 个情绪标签
  is_test      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 昵称唯一（不区分大小写），禁止重名
CREATE UNIQUE INDEX IF NOT EXISTS members_nickname_lower_key ON members (lower(nickname));

-- 信件
CREATE TABLE IF NOT EXISTS letters (
  id               SERIAL PRIMARY KEY,
  sender_id        INT REFERENCES members(id) ON DELETE CASCADE,
  recipient_id     INT REFERENCES members(id) ON DELETE SET NULL,  -- pending 信为 NULL
  sender_nickname  TEXT NOT NULL,
  moods            TEXT[] NOT NULL DEFAULT '{}',
  title            TEXT NOT NULL DEFAULT '',
  body             TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'in_transit',  -- pending | in_transit | delivered | read
  sent_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  open_at          TIMESTAMPTZ NOT NULL,                -- 可拆时间
  opened_at        TIMESTAMPTZ,
  -- 回信（双向：replied_to_id 指向被回复的信）
  replied_to_id    INT REFERENCES letters(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_letters_recipient ON letters(recipient_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_letters_sender ON letters(sender_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_letters_open_at ON letters(open_at);

-- 手动配对池：新旧用户都可以在这里挂名，管理员手动指定配对
-- 匹配等待池：注册后自动入池，有共同标签即出池配对
CREATE TABLE IF NOT EXISTS match_pool (
  id         SERIAL PRIMARY KEY,
  member_id  INT REFERENCES members(id) ON DELETE CASCADE UNIQUE,
  note       TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 配对事件（解除 / 建立），留痕用
CREATE TABLE IF NOT EXISTS match_events (
  id         SERIAL PRIMARY KEY,
  a_id       INT,
  b_id       INT,
  kind       TEXT NOT NULL, -- paired | dissolved
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 配对关系（手动配对结果，双向各一行）
CREATE TABLE IF NOT EXISTS pairs (
  id         SERIAL PRIMARY KEY,
  member_id  INT REFERENCES members(id) ON DELETE CASCADE,
  peer_id    INT REFERENCES members(id) ON DELETE CASCADE,
  paired_by  TEXT NOT NULL DEFAULT 'admin',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(member_id, peer_id)
);
