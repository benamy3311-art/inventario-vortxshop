// Productos publicados en Mercado Libre. Cada diseño: [número, nombre, color de referencia].
export const GROUPS = [
  { id: "hilos", kind: "cuadro", title: "Cuadro de hilos", size: "43 × 43 cm", mco: "4202670772", items: [
    [1, "Espiral azul y dorado", "#2D4A98"], [2, "Gota azul, verde y dorado", "#1F7A8C"], [3, "Aro rojo y blanco", "#8A2125"],
    [4, "Aro azul y verde", "#2A8A9C"], [5, "Aro dorado y blanco", "#C49A3C"], [6, "Espiral dorado y azul, fondo rosa", "#C98F7A"],
    [7, "Gota dorado y azul, fondo rosa", "#C69E80"], [8, "Espiral dorado y blanco", "#213359"], [9, "Gota gris, violeta y dorado", "#7D6A9E"],
    [10, "Gota roja y dorado", "#6C2B29"] ] },
  { id: "textura", kind: "cuadro", title: "Cuadro textura 3D", size: "43 × 43 cm", mco: "4201938090", items: [
    [11, "Amarillo y negro", "#BF8B0D"], [12, "Blanco y azul", "#435F7E"], [13, "Blanco y amarillo", "#D4A520"], [14, "Blanco y violeta", "#6A5A9A"] ] },
  { id: "busto", kind: "cuadro", title: "Cuadro busto griego", size: "43 × 43 cm", mco: "2054234933", items: [
    [15, "Busto femenino", "#B58267"], [16, "Busto masculino", "#B9886C"] ] },
  { id: "circular", kind: "cuadro", title: "Cuadro circular 3D", size: "", mco: "4147130620", items: [
    [17, "Azul y negro", "#226378"], [32, "Crema y dorado", "#C9A227"], [33, "Naranja", "#D9541E"] ] },
  { id: "c3d", kind: "cuadro", title: "Cuadro 3D", size: "79,5 × 59 cm", mco: "2054338879", items: [
    [18, "Blanco y dorado", "#AB8F5C"], [19, "Naranja", "#A55E29"], [20, "Taupe", "#604D3E"], [21, "Blanco y azul", "#466A86"] ] },
  { id: "c3dg", kind: "cuadro", title: "Cuadro 3D grande", size: "120 × 80 cm", mco: "2054323967", items: [
    [22, "Blanco y naranja", "#CC8A68"], [23, "Azul y negro", "#1B4F60"], [24, "Naranja", "#C75C22"] ] },
  { id: "ejecutiva", kind: "silla", title: "Silla Ejecutiva Madrid", size: "Altura máx. 120 cm", mco: "4153810126", items: [
    [25, "Naranja y blanco", "#D5712E"], [26, "Negro y café madera", "#996E53"], [27, "Blanco y madera", "#B08A5E"] ] },
  { id: "auxiliar", kind: "silla", title: "Silla Auxiliar Madrid", size: "Altura máx. 90 cm", mco: "4154286354", items: [
    [28, "Negro y café", "#A17660"], [29, "Naranja y blanco", "#D36A24"] ] },
  { id: "reclinable", kind: "silla", title: "Silla Ergonómica Reclinable", size: "Altura máx. 155 cm", mco: "1988274917", items: [
    [30, "Negra", "#3A3A3C"] ] },
  { id: "malla", kind: "silla", title: "Silla Ergonómica de Malla", size: "Altura máx. 124 cm", mco: "4077261460", items: [
    [31, "Gris y negro", "#8E9196"] ] },
];

export const ITEMS = [];
GROUPS.forEach(g => g.items.forEach(([n, name, color]) =>
  ITEMS.push({ n, name, color, g, img: `img/${g.kind === "cuadro" ? "c" : "s"}${String(n).padStart(2, "0")}.jpg` })));
export const TOTAL = ITEMS.length;
