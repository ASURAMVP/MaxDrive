-- seed a demo user
INSERT INTO users(id,email,plan) VALUES ('demo-user','demo@megamax.local','free') ON CONFLICT DO NOTHING;
