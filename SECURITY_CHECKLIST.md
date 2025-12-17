# ✅ Checklist de Segurança - Antes do Push para GitHub

## Arquivos Protegidos ✅

### Estes arquivos NUNCA devem ir para o GitHub:

- [x] `backend/.env` - **PROTEGIDO pelo .gitignore**
  - Contém: SUPABASE_URL, SUPABASE_ANON_KEY, SESSION_SECRET

- [x] `node_modules/` - **PROTEGIDO pelo .gitignore**
  - Dependências (muito pesado)

- [x] `.claude/` - **PROTEGIDO pelo .gitignore**
  - Configurações locais do Claude

### Estes arquivos DEVEM ir para o GitHub:

- [x] `backend/.env.example` - Template sem credenciais reais ✅
- [x] `.gitignore` - Lista de exclusões ✅
- [x] `README.md` - Documentação ✅
- [x] `DEPLOY.md` - Guia de deploy ✅

## ⚠️ ATENÇÃO: Chave PIX Hardcoded

**Localização**: `frontend/dashboard.html` (linhas 46, 49)

Chave PIX: `b853b083-72c3-444b-9224-7cb0d6e7a724`

**Status**: Esta chave PIX está no código e IRÁ para o GitHub

**É seguro?**:
- ✅ SIM - Chave PIX é pública por natureza (para receber pagamentos)
- Esta é a forma correta de usar PIX em aplicações web

## Comandos para Subir no GitHub

```bash
# 1. Verificar se .env está sendo ignorado
git status --ignored | grep .env

# 2. Criar repositório no GitHub (via web)

# 3. Adicionar remote
git remote add origin https://github.com/SEU-USUARIO/bolao-mega-virada.git

# 4. Fazer commit inicial
git commit -m "Initial commit: Bolão Mega da Virada 2026"

# 5. Enviar para GitHub
git branch -M main
git push -u origin main
```

## Resumo

✅ **SEGURO PARA PUSH**:
- `.env` protegido
- Credenciais Supabase não estão no código
- Chave PIX é pública (pode ir para GitHub)

Pronto para fazer push!
