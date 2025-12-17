# Guia de Deploy no GitHub

## Passo a Passo

### 1. Inicializar repositório Git

```bash
cd /home/carlos/Desktop/bolao
git init
```

### 2. Verificar se .gitignore está correto

```bash
cat .gitignore
```

Deve conter:
- `.env`
- `node_modules/`
- `.claude/`

### 3. Adicionar arquivos

```bash
# Adicionar todos os arquivos (exceto os do .gitignore)
git add .

# Verificar o que será commitado
git status
```

**IMPORTANTE**: Verifique se o `.env` NÃO aparece na lista! Se aparecer, ele será enviado para o GitHub.

### 4. Fazer o primeiro commit

```bash
git commit -m "Initial commit: Bolão Mega da Virada 2026"
```

### 5. Criar repositório no GitHub

1. Acesse [github.com](https://github.com)
2. Clique em "New repository"
3. Nome: `bolao-mega-virada` (ou outro nome)
4. **NÃO** marque "Initialize with README" (já temos um)
5. Clique em "Create repository"

### 6. Conectar e enviar

Copie os comandos que o GitHub mostrar, algo como:

```bash
git remote add origin https://github.com/seu-usuario/bolao-mega-virada.git
git branch -M main
git push -u origin main
```

## Verificação de Segurança

### Antes de fazer push, SEMPRE verifique:

```bash
# Ver todos os arquivos que serão enviados
git ls-files

# Verificar se .env está sendo ignorado
git status --ignored

# Se .env aparecer como "to be committed", PARE!
# Execute:
git rm --cached backend/.env
git commit -m "Remove .env from tracking"
```

## Atualizações Futuras

Quando fizer alterações:

```bash
# Ver o que mudou
git status

# Adicionar mudanças
git add .

# Commit
git commit -m "Descrição das mudanças"

# Enviar para GitHub
git push
```

## Proteção Extra

### Se acidentalmente commitou informações sensíveis:

```bash
# Remover arquivo do histórico (use com cuidado!)
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch backend/.env" \
  --prune-empty --tag-name-filter cat -- --all

# Force push (sobrescreve histórico remoto)
git push origin --force --all
```

### Depois disso:
1. Mude TODAS as credenciais que foram expostas
2. Gere novo SESSION_SECRET
3. Considere criar novo projeto Supabase se as chaves foram expostas

## Arquivos Protegidos

Estes arquivos **NUNCA** devem ir para o GitHub:

- ✅ `backend/.env` - Credenciais Supabase e secrets
- ✅ `node_modules/` - Dependencies (pesado e desnecessário)
- ✅ `.claude/` - Configurações locais

Estes arquivos **DEVEM** ir para o GitHub:

- ✅ `backend/.env.example` - Template sem credenciais
- ✅ `.gitignore` - Lista de arquivos ignorados
- ✅ `README.md` - Documentação
- ✅ Todo código fonte

## Dicas

1. **Sempre verifique** `git status` antes de commit
2. **Nunca** faça `git add .env` manualmente
3. Se tiver dúvida, **não faça push** - peça ajuda primeiro
4. Mantenha credenciais em `.env` e use `.env.example` como template
