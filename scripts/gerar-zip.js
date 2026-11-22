// Gera um .zip de cada skill do plugin para envio no claude.ai.
// O claude.ai aceita só name, description, license, compatibility, metadata e
// allowed-tools no cabeçalho; os outros campos (como disable-model-invocation)
// são retirados na cópia. Uso: node scripts/gerar-zip.js  → dist/<skill>.zip
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const raiz = path.resolve(__dirname, '..');
const skills = path.join(raiz, 'plugins', 'seguranca-aplicacoes', 'skills');
const saida = path.join(raiz, 'dist');
const aceitos = new Set(['name', 'description', 'license', 'compatibility', 'metadata', 'allowed-tools']);

function limparCabecalho(texto) {
  const m = texto.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!m) throw new Error('SKILL.md sem cabeçalho');
  const linhas = m[1].split(/\r?\n/);
  const mantidas = [];
  let manter = true;
  for (const l of linhas) {
    const campo = l.match(/^([A-Za-z0-9_-]+):/);
    if (campo) manter = aceitos.has(campo[1]);
    if (manter) mantidas.push(l);
  }
  return '---\n' + mantidas.join('\n') + '\n---\n' + texto.slice(m[0].length);
}

fs.mkdirSync(saida, { recursive: true });
for (const nome of fs.readdirSync(skills)) {
  const origem = path.join(skills, nome);
  if (!fs.existsSync(path.join(origem, 'SKILL.md'))) continue;
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-'));
  const destino = path.join(temp, nome);
  fs.cpSync(origem, destino, { recursive: true });
  const arq = path.join(destino, 'SKILL.md');
  fs.writeFileSync(arq, limparCabecalho(fs.readFileSync(arq, 'utf8')));
  const zip = path.join(saida, nome + '.zip');
  fs.rmSync(zip, { force: true });
  // No Windows, usar o tar do sistema (bsdtar, que grava zip); o do Git Bash não grava.
  const tar = path.join(process.env.SystemRoot || 'C:\\Windows','System32', 'tar.exe');
  if (process.platform === 'win32') execFileSync(tar, ['-a', '-c', '-f', zip, nome], { cwd: temp });
  else execFileSync('zip', ['-r', '-q', zip, nome], { cwd: temp });
  fs.rmSync(temp, { recursive: true, force: true });
  console.log('gerado: ' + path.relative(raiz, zip));
}
