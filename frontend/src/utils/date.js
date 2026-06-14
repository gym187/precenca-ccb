// Retorna data atual em YYYY-MM-DD no fuso local (evita drift de UTC em
// dispositivos no Brasil onde toISOString() já está no dia seguinte à noite).
export const hojeISO = () => {
  const d = new Date()
  const ano = d.getFullYear()
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}

export const diasAtrasISO = (dias) => {
  const d = new Date()
  d.setDate(d.getDate() - dias)
  const ano = d.getFullYear()
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}
