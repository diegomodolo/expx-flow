-- Corrigir configurações de segurança
-- 1. Ajustar tempo de expiração do OTP para o recomendado (15 minutos)
UPDATE auth.config 
SET value = '15 minutes'
WHERE parameter = 'otp_expiry';

-- 2. Habilitar proteção contra senhas vazadas
UPDATE auth.config 
SET value = 'true'
WHERE parameter = 'leaked_password_protection';

-- Caso as configurações não existam, criar elas
INSERT INTO auth.config (parameter, value) 
VALUES ('otp_expiry', '15 minutes') 
ON CONFLICT (parameter) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO auth.config (parameter, value) 
VALUES ('leaked_password_protection', 'true') 
ON CONFLICT (parameter) DO UPDATE SET value = EXCLUDED.value;