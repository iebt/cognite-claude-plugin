# IEBT Migration Installer

Esse é o instalador do Modernizador de Legado do IEBT.

Basta rodar:

```sh
npx install-iebt-migration

# ou com a opção de debug para mais logs:
npx install-iebt-migration --debug
```

E ele vai seguir os seguintes passos:

1. Instalar o Claude Code se não estiver já instalado
2. Baixar os comandos customizados para a migração
3. Garantir que o certificado Umbrella está acessível na sessão para permitir acesso pelo Firewall
4. Definir as variáveis de ambiente necessárias
