/* Tipos: nomes em português e cores. */
import { hexToRgb } from './utils.js';

/* Tipos: rótulo em PT + cor clássica */
export const TYPES = {
  normal:['Normal','#a8a77a'], fire:['Fogo','#ee8130'], water:['Água','#6390f0'], electric:['Elétrico','#f7d02c'],
  grass:['Planta','#7ac74c'], ice:['Gelo','#96d9d6'], fighting:['Lutador','#c22e28'], poison:['Venenoso','#a33ea1'],
  ground:['Terrestre','#e2bf65'], flying:['Voador','#a98ff3'], psychic:['Psíquico','#f95587'], bug:['Inseto','#a6b91a'],
  rock:['Pedra','#b6a136'], ghost:['Fantasma','#735797'], dragon:['Dragão','#6f35fc'], dark:['Sombrio','#705746'],
  steel:['Aço','#b7b7ce'], fairy:['Fada','#d685ad'], stellar:['Estelar','#40b5a5'], unknown:['???','#68a090'],
};
export const textOn = (hex) => { const [r, g, b] = hexToRgb(hex); return (r * 299 + g * 587 + b * 114) / 1000 > 150 ? '#111' : '#fff'; };
