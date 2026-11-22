"""Valida os modelos de esteira das duas skills.

Para cada bloco ```yaml``` em references/esteira/*.md:
1. o YAML abre sem erro;
2. cada item de script/before_script/after_script e cada run é texto (um ": " solto
   transforma o comando em outra estrutura e a plataforma recusa o arquivo).

Uso: python scripts/validar-modelos.py   (sai com código 1 se houver problema)
"""
import glob
import os
import re
import sys

import yaml

RAIZ = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')


def percorrer(obj, caminho, problemas):
    if isinstance(obj, dict):
        for chave, valor in obj.items():
            if chave in ('script', 'before_script', 'after_script') and isinstance(valor, list):
                for i, item in enumerate(valor):
                    if not isinstance(item, str) and not (isinstance(item, dict) and 'pipe' in item):
                        problemas.append(f'{caminho}.{chave}[{i}] não é texto')
            if chave == 'run' and not isinstance(valor, str):
                problemas.append(f'{caminho}.run não é texto')
            percorrer(valor, f'{caminho}.{chave}', problemas)
    elif isinstance(obj, list):
        for i, item in enumerate(obj):
            percorrer(item, f'{caminho}[{i}]', problemas)


def main():
    total = 0
    arquivos = sorted(glob.glob(os.path.join(RAIZ, 'plugins', '*', 'skills', '*', 'references', 'esteira', '*.md')))
    for arq in arquivos:
        texto = open(arq, encoding='utf-8').read()
        for n, bloco in enumerate(re.findall(r'```ya?ml\n(.*?)```', texto, re.S)):
            problemas = []
            try:
                for doc in yaml.safe_load_all(bloco):
                    percorrer(doc, '', problemas)
            except yaml.YAMLError as erro:
                problemas.append('YAML inválido: ' + str(erro).splitlines()[0])
            for p in problemas:
                print(f'{os.path.relpath(arq, RAIZ)} bloco {n}: {p}')
            total += len(problemas)
    print(f'{len(arquivos)} arquivos conferidos; problemas: {total}')
    sys.exit(1 if total else 0)


if __name__ == '__main__':
    main()
