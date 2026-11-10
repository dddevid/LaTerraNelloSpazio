import xml.etree.ElementTree as ET
import json

svg_path = r'c:\Users\devid\Downloads\LaTerraNelloSpazio\assets\homo_sapiens.svg'
tree = ET.parse(svg_path)
root = tree.getroot()

# Remove metadata and namedview
for child in list(root):
    tag = child.tag.split('}')[-1]
    if tag in ('metadata', 'namedview'):
        root.remove(child)

# Clean LAYER_OUTLINE: keep only human_male_outline
outline_g = [el for el in root if el.attrib.get('id') == 'LAYER_OUTLINE'][0]
for ch in list(outline_g):
    if ch.attrib.get('id') != 'human_male_outline':
        outline_g.remove(ch)
    else:
        ch.attrib.pop('style', None)

# Ordered back-to-front anatomical organs and their functional group
ORGANS_ORDER = [
    # (id, group_class, organ_key)
    ('UBERON_0001103', 'org org-lung', 'polmoni'),      # Diaphragm
    ('UBERON_0002048', 'org org-pm25 org-lung', 'polmoni'), # Lungs (Alveoli)
    ('UBERON_0000955', 'org org-pm25 org-brain', 'cervello'), # Brain
    ('UBERON_0000956', 'org org-pm25 org-brain-detail', 'cervello'), # Cerebral cortex
    ('UBERON_0002037', 'org org-pm25 org-brain', 'cervello'), # Cerebellum
    ('UBERON_0001728', 'org org-pm10 org-airway', 'naso'),   # Nasopharynx
    ('UBERON_0000004', 'org org-pm10 org-nose', 'naso'),     # Nose
    ('UBERON_0000341', 'org org-pm10 org-airway', 'naso'),   # Throat / Pharynx
    ('UBERON_0002185', 'org org-pm10 org-bronchi', 'bronchi'), # Bronchial tree
    ('UBERON_0003126', 'org org-pm10 org-trachea', 'bronchi'), # Trachea
    ('UBERON_0000947', 'org org-pm25 org-aorta', 'cuore'),   # Aorta
    ('UBERON_0000948', 'org org-pm25 org-heart', 'cuore'),   # Heart
    ('UBERON_0001621', 'org org-pm25 org-vessels', 'cuore'), # Coronary arteries
]

efo = [el for el in root if el.attrib.get('id') == 'LAYER_EFO'][0]
by_id = {ch.attrib.get('id'): ch for ch in list(efo)}

# Clear efo and re-insert in exact back-to-front order
for ch in list(efo):
    efo.remove(ch)

for uid, cls, key in ORGANS_ORDER:
    el = by_id.get(uid)
    if el is None:
        continue
    el.attrib['class'] = cls
    el.attrib['data-organ-key'] = key
    for sub in el.iter():
        sub.attrib.pop('style', None)
    efo.append(el)

# Set cropped viewBox focused on head, neck, chest and upper torso (stops above waist)
root.attrib['viewBox'] = '18 0 70 68'
root.attrib['width'] = '100%'
root.attrib['height'] = '100%'
root.attrib['class'] = 'anatomogram-svg'

ET.register_namespace('', 'http://www.w3.org/2000/svg')
ET.register_namespace('xlink', 'http://www.w3.org/1999/xlink')

svg_str = ET.tostring(root, encoding='unicode')

with open(r'c:\Users\devid\Downloads\LaTerraNelloSpazio\assets\homo_sapiens_clean.svg', 'w', encoding='utf-8') as f:
    f.write(svg_str)

with open(r'c:\Users\devid\Downloads\LaTerraNelloSpazio\js\data\anatomogram-svg.js', 'w', encoding='utf-8') as f:
    f.write('// Generato dall\'asset ufficiale EMBL-EBI Anatomogram (homo_sapiens.male.svg)\n')
    f.write('window.ANATOMOGRAM_SVG = ' + json.dumps(svg_str) + ';\n')

print('Done! Clean SVG size:', len(svg_str))
