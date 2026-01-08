# Boleto Fácil Pro

Sistema profissional para gestão e emissão de boletos, com suporte a múltiplos bancos, layouts personalizados e integração CNAB.

## 🚀 Funcionalidades

### Principal
- **Dashboard**: Visão geral das operações.
- **Gerar Boletos**: Interface para geração e emissão de boletos.

### Cadastros
- **Clientes**: Gestão de base de clientes.
- **Notas Fiscais**: Controle de notas fiscais.
- **Bancos**: Configuração de instituições financeiras.

### Configurações
- **Modelos de Layout**: Personalização visual dos boletos.
- **Padrões CNAB**: Configuração de arquivos de remessa e retorno.
- **Importar Layout (IA)**: Ferramenta inteligente para importação de layouts.
- **Configurações Gerais**: Ajustes do sistema.

### Segurança e Auditoria
- **Soft Delete**: Sistema de exclusão lógica para proteção de dados (clientes, boletos, modelos, etc.).
- **Audit Log**: Registro detalhado de operações críticas (quem excluiu, quando e qual registro).
- **Triggers de Proteção**: Mecanismos de banco de dados para garantir integridade e consistência.

## 🛠️ Tecnologias Utilizadas

- **Frontend**: React, Vite, TypeScript
- **UI/UX**: Tailwind CSS, Shadcn UI, Lucide Icons
- **Backend/Database**: Supabase
- **PDF**: jsPDF

## 💻 Como Rodar o Projeto

### Pré-requisitos
- Node.js instalado (versão 18 ou superior recomendada)

### Instalação

1. Clone o repositório (se ainda não o fez):
```bash
git clone <URL_DO_REPOSITORIO>
```

2. Entre na pasta do projeto:
```bash
cd boleto-f-cil-pro
```

3. Instale as dependências:
```bash
npm install
```

### Executando Localmente

Para iniciar o servidor de desenvolvimento:

```bash
npm run dev
```

O projeto estará acessível em `http://localhost:8080` (ou outra porta indicada no terminal).

## 📄 Estrutura do Projeto

- `/src`: Código fonte da aplicação
  - `/components`: Componentes React reutilizáveis
  - `/pages`: Páginas da aplicação
  - `/lib`: Funções utilitárias e lógica de negócios
  - `/hooks`: Hooks customizados
  - `/types`: Definições de tipos TypeScript
