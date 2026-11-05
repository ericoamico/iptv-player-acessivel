# IPTV Acessível

Aplicativo de IPTV para Android feito para ser usado com leitor de tela (**TalkBack**).
Você entra com os dados da sua lista de canais, navega pelas categorias e assiste aos canais
com a programação de cada um.

O app não vem com nenhuma lista de canais: você usa os dados que recebeu do seu provedor.

## Baixar

**[Baixar a versão mais recente (APK)](https://github.com/ericoamico/iptv-player-acessivel/releases/download/apk-latest/iptv-acessivel.apk)**

Funciona no Android 7 ou mais novo.

### Como instalar

1. Abra o arquivo baixado no celular.
2. O Android vai pedir para permitir a instalação de apps desconhecidos pelo navegador ou pelo
   gerenciador de arquivos. Permita.
3. Se o Play Protect avisar que o app não é conhecido, escolha **Instalar mesmo assim**.

## Entrar

Na primeira tela, escolha o tipo de acesso:

- **Servidor, usuário e senha**: o mais comum. Preencha:
  - **Servidor**: o endereço informado pelo provedor, por exemplo `http://servidor.com:8080`.
    Nos dados do provedor ele costuma aparecer como "URL", "DNS" ou "Servidor".
  - **Usuário** e **Senha**.
- **Link da lista M3U**: se o provedor mandou um link de lista.

Se você recebeu um link completo com usuário e senha (com `username=` e `password=`), basta colar
esse link no campo **Servidor**: o app preenche os três campos sozinho.

Usuário e senha ficam guardados de forma criptografada no celular.

## Usando o app

### Categorias e canais

- A tela inicial mostra as categorias. **Favoritos** é o primeiro item.
- Cada categoria abre uma tela nova com os canais.
- Cada canal mostra o que está passando agora e o que vem a seguir.
- Há um campo para buscar canais dentro da categoria.

### Player

- Toque duas vezes num canal para assistir. O player abre numa tela nova.
- Botões: **Canal anterior**, **Reproduzir/Pausar**, **Próximo canal**, **Tela cheia**,
  **Adicionar aos favoritos** e **Programação**.
- Ao começar a tocar, o leitor de tela anuncia o canal e o programa atual.
- Em paisagem, os controles não somem enquanto o TalkBack estiver ligado.
- Se um canal não abrir, use **Tentar novamente** ou **Tentar formato HLS/TS**.

### Favoritos

- Adicione um canal aos favoritos pela ação do TalkBack **Adicionar aos favoritos**, pela estrela
  ao lado do canal ou pelo botão no player.
- Dentro de **Favoritos**, as ações **Mover para cima** e **Mover para baixo** mudam a ordem.
- Ao abrir um canal pelos Favoritos, **Próximo canal** e **Canal anterior** passam só pelos favoritos.
- Os favoritos ficam salvos no celular. Desinstalar o app ou limpar os dados dele apaga os favoritos.

## Usando com o TalkBack

Além do toque duplo, vários itens têm **ações extras**. Para usá-las, coloque o foco no item e
deslize para cima ou para baixo com o controle de leitura em **Ações**, ou abra o menu de ações
do TalkBack.

| Onde | Ações |
|---|---|
| Categoria | Abrir categoria, Atualizar lista |
| Canal | Assistir, Ver programação, Adicionar/Remover dos favoritos |
| Canal dentro de Favoritos | Também Mover para cima e Mover para baixo |
| Nome do canal no player | Próximo canal, Canal anterior, Pausar/Reproduzir, Ver programação, Adicionar/Remover dos favoritos, Tela cheia, O que está passando |
| Programa na programação | Assistir este canal |

No player, a ação **O que está passando** lê o canal, a situação do vídeo e o programa atual
e o próximo.

## Configurações

Acesse pelo botão **Configurações** (aparece na tela como "Ajustes") no topo da tela de categorias.

- **Modo de tela**: Retrato (padrão), Paisagem ou Automático.
- **Girar livremente no player**: permite assistir em paisagem mesmo com o app em retrato.
- **Lista de canais**: atualizar agora, ou automaticamente a cada 12 ou 24 horas.
- **Guia de programação**:
  - O "agora / a seguir" de cada canal é buscado no servidor só para os canais que aparecem na
    tela, por isso pode levar um ou dois segundos para aparecer.
  - **Baixar guia completo agora** traz a programação de todos os canais de uma vez. Esse arquivo
    costuma ser grande e pode demorar.
  - Também é possível informar o endereço de um guia próprio (XMLTV).
- **Formato do vídeo**: TS ou HLS. Troque se algum canal não abrir.
- **Atualizações do app**: mostra a versão instalada e tem o botão **Procurar atualização**.
- **Conta**: servidor, usuário, validade e o botão **Sair da conta**.

## Atualizações

O app procura uma versão nova ao ser aberto. Quando houver, ele avisa e oferece
**Atualizar agora**: baixa a nova versão e abre o instalador do Android para você confirmar.

Na primeira atualização, o Android pede para permitir que o IPTV Acessível instale apps.
Permita e volte ao app. A atualização mantém o login e os favoritos.

## Problemas comuns

- **"Usuário ou senha incorretos"**: confira os dados enviados pelo provedor.
- **"Não foi possível conectar ao servidor"**: confira o endereço do servidor e a internet.
- **O canal abre mas não toca**: use **Tentar formato HLS/TS** no player, ou troque o formato do
  vídeo nas Configurações.
- **A programação não aparece**: alguns provedores não têm programação para todos os canais.
  Tente **Baixar guia completo agora** nas Configurações.

## Desenvolvimento

Informações técnicas, como compilar o app e como o APK é gerado, estão em
[docs/DESENVOLVIMENTO.md](docs/DESENVOLVIMENTO.md).
