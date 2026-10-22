// Guide window "Zone combat — the three layouts": example boards drawn with the Combat
// window's zone board (src/game/zoneBoard.js), each with a short caption. Opened from the
// Guide's "Zone combat" tab.
import { el } from '../shell/dom.js';
import { renderZoneBoard } from '../game/zoneBoard.js';

const Z = (id, name) => ({ id, name, inside: id !== 'outer' && id !== 'out' });
const EXAMPLES = [
    {
        title: 'Small room', text: 'The whole room is one zone: the hero and the goblins are in melee right away. The archer waits just outside the door.',
        view: { kind: 'small', layout: { kind: 'small', arms: [] }, zones: [Z('inner', 'the room'), Z('outer', 'just outside')],
            doors: [{ dir: 's', type: 'door', state: 'open', to: 'the corridor' }], features: [{ id: 'f1', name: 'Table', cover: 'half', zone: 'inner' }],
            pos: { you: 'inner', g1: 'inner', g2: 'inner', a: 'outer' } },
        tokens: [{ id: 'you', name: 'You', side: 'party', current: true }, { id: 'g1', name: 'Goblin 1', side: 'enemy' }, { id: 'g2', name: 'Goblin 2', side: 'enemy' }, { id: 'a', name: 'Archer', side: 'enemy' }],
    },
    {
        title: 'Large space', text: 'A centre and four sides. You came in by the west door; the wolves are on the far side, two moves away. Behind the pillar in the north an archer has three-quarters cover.',
        view: { kind: 'large', layout: { kind: 'large', arms: [] }, zones: ['c', 'n', 'e', 's', 'w', 'outer'].map(z => Z(z, z)),
            doors: [{ dir: 'w', type: 'door', state: 'open', to: 'Entrance' }, { dir: 'e', type: 'door', state: 'closed', to: 'Crypt' }],
            features: [{ id: 'f1', name: 'Pillar', cover: 'three', zone: 'n' }, { id: 'f2', name: 'Altar', cover: 'half', zone: 'c' }],
            pos: { you: 'w', ally: 'w', w1: 'e', w2: 'e', a: 'n' } },
        tokens: [{ id: 'you', name: 'You', side: 'party', current: true }, { id: 'ally', name: 'Rowan', side: 'party' }, { id: 'w1', name: 'Wolf 1', side: 'enemy' }, { id: 'w2', name: 'Wolf 2', side: 'enemy' }, { id: 'a', name: 'Archer', side: 'enemy', cover: true }],
    },
    {
        title: 'Corridor', text: 'A crossing: the middle and its four arms, with rock between them. The walls block movement and arrows: the skeleton in the east arm cannot shoot around the corner into the north arm, only along its passage or into the middle.',
        view: { kind: 'corridor', layout: { kind: 'corridor', arms: ['n', 'e', 's', 'w'] }, zones: ['c', 'n', 'e', 's', 'w', 'outer'].map(z => Z(z, z)),
            doors: [], features: [], pos: { you: 'n', s1: 'e' } },
        tokens: [{ id: 'you', name: 'You', side: 'party', current: true }, { id: 's1', name: 'Skeleton', side: 'enemy' }],
    },
];

export function createZoneDemoView() {
    function render(box) {
        while (box.firstChild) box.removeChild(box.firstChild);
        const wrap = el('div', { class: 'rpm-zone-demo', 'data-zone-demo': '1' });
        wrap.appendChild(el('p', { class: 'rpm-muted', style: 'margin:0 0 8px', text: 'Blue tokens are your party, red ones enemies; the gold ring marks whose turn it is. Squares on the edge are doors, small squares inside are features that give cover.' }));
        for (const ex of EXAMPLES) {
            const { svg } = renderZoneBoard(ex.view, { tokens: ex.tokens, label: ex.title });
            wrap.appendChild(el('div', { class: 'rpm-card', 'data-example': ex.view.kind }, [
                el('div', { class: 'rpm-heading', text: ex.title }), svg, el('p', { style: 'margin:4px 0 0', text: ex.text }),
            ]));
        }
        box.appendChild(wrap);
    }
    return { id: 'zones-demo', title: 'Zone combat — the three layouts', place: 'window', window: { width: 420, height: 620, minWidth: 300, minHeight: 280 }, mount: render, update: render };
}
