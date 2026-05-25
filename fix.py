import os

path = 'src/components/InterconsultaModal.jsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('<label className=" form-label\>', '<label className="form-label">')

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
