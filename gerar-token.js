import fs from "fs";
import path from "path";

// COLOCAR O NOME DO SEU ARQUIVO JSON AQUI
const nomeArquivoJson = "service-account.json";

try {
  // Em projetos modernos (ESM), usamos process.cwd() para pegar a raiz
  const caminho = path.resolve(process.cwd(), nomeArquivoJson);
  const conteudo = fs.readFileSync(caminho, "utf8");

  // Converte para Base64
  const base64 = Buffer.from(conteudo).toString("base64");

  console.log(
    "\n✅ SUCESSO! Copie a linha abaixo inteira (sem aspas) para o seu .env.local:\n"
  );
  console.log(`FIREBASE_SERVICE_ACCOUNT_JSON_B64=${base64}`);
  console.log("\n");
} catch (e) {
  console.error(
    "Erro: Não encontrei o arquivo JSON na raiz ou ele está com outro nome."
  );
  console.error(e.message);
}
