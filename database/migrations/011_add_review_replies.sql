-- ============================================================
-- Migration 011: Add review_replies table
-- 添加评价回复表（评论区追问/回复功能）
--
-- Rollback:
--   DROP TABLE IF EXISTS review_replies;
-- ============================================================

CREATE TABLE IF NOT EXISTS review_replies (
    id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
    review_id   UUID        NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
    author_id   UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    content     TEXT        NOT NULL CHECK (char_length(content) BETWEEN 1 AND 500),
    created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_review_replies_review_id ON review_replies(review_id);

-- RLS
ALTER TABLE review_replies ENABLE ROW LEVEL SECURITY;

-- 任何人都可以查看回复（评价区公开）
CREATE POLICY "Anyone can view review replies"
    ON review_replies FOR SELECT
    USING (true);

-- 已登录用户可以发布回复
CREATE POLICY "Authenticated users can post replies"
    ON review_replies FOR INSERT
    WITH CHECK (auth.uid() = author_id);

-- 作者可以删除自己的回复
CREATE POLICY "Authors can delete own replies"
    ON review_replies FOR DELETE
    USING (auth.uid() = author_id);

-- 开放 anon/authenticated 读权限
GRANT SELECT ON review_replies TO anon, authenticated;
GRANT INSERT, DELETE ON review_replies TO authenticated;

-- 添加 review_reply 通知枚举值（若 enum 不支持 ADD VALUE 则改用 'system' 类型）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'review_reply'
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'notification_type')
  ) THEN
    ALTER TYPE notification_type ADD VALUE 'review_reply';
  END IF;
END
$$;
