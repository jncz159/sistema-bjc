"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from './supabaseClient';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell 
} from 'recharts';

export default function SistemaBJCMasterFinal() {
  // --- 🕒 UTILS: HORA EXACTA PERÚ (GMT-5) ---
  const getFechaPeru = (dateInput = new Date()) => {
    const opciones = { timeZone: "America/Lima", year: 'numeric', month: '2-digit', day: '2-digit' };
    const partes = new Intl.DateTimeFormat('en-CA', opciones).formatToParts(new Date(dateInput));
    const anio = partes.find(p => p.type === 'year').value;
    const mes = partes.find(p => p.type === 'month').value;
    const dia = partes.find(p => p.type === 'day').value;
    return `${anio}-${mes}-${dia}`;
  };

  // --- 💰 UTILS: LIMPIEZA DE DECIMALES (PUNTO Y COMA) ---
  const handleInputMonto = (valor) => {
    if (typeof valor !== 'string') return valor;
    // Reemplaza coma por punto y elimina cualquier caracter no numérico (excepto el punto)
    let limpio = valor.replace(',', '.');
    return limpio.replace(/[^0-9.]/g, '');
  };

  // --- 🏷️ UTILS: ANTIGÜEDAD DE PRODUCTOS ---
  const getEtiquetaProducto = (createdAt) => {
    const fechaCreacion = new Date(createdAt);
    const hoy = new Date();
    const diferenciaDias = Math.floor((hoy - fechaCreacion) / (1000 * 60 * 60 * 24));
    if (diferenciaDias <= 3) return { tipo: 'NUEVO', icono: '✨', color: '#F786C1' };
    if (diferenciaDias > 3 && diferenciaDias <= 8) return { tipo: 'RECIENTE', icono: '📦', color: '#A13C6D' };
    return null;
  };

  // --- 📊 ESTADOS PRINCIPALES ---
  const [vista, setVista] = useState('ventas'); 
  const [productos, setProductos] = useState([]);
  const [ventas, setVentas] = useState([]);
  const [finanzas, setFinanzas] = useState([]);
  const [busqueda, setBusqueda] = useState(''); 
  const [busquedaStock, setBusquedaStock] = useState(''); 
  const [fechaConsulta, setFechaConsulta] = useState(getFechaPeru());
  
  // --- 🛒 ESTADOS VENTAS ---
  const [cliente, setCliente] = useState('');
  const [localidad, setLocalidad] = useState(''); 
  const [telefono, setTelefono] = useState(''); 
  const [tipoVenta, setTipoVenta] = useState('Mayor'); 
  const [cantidades, setCantidades] = useState({});
  const [coloresElegidos, setColoresElegidos] = useState({});
  const [carrito, setCarrito] = useState([]);
  const [descuento, setDescuento] = useState(0); 

  // --- ✏️ ESTADOS EDICIÓN (VENTAS Y GASTOS) ---
  const [idVentaEditando, setIdVentaEditando] = useState(null);
  const [formEditVenta, setFormEditVenta] = useState({});
  const [idFinanzaEditando, setIdFinanzaEditando] = useState(null);
  const [formEditFinanza, setFormEditFinanza] = useState({});
  
  // --- ⚙️ ESTADOS GESTIÓN ---
  const [formProd, setFormProd] = useState({ nombre: '', precio_compra: '', precio_venta: '', precio_menor: '', stock: '', colores: '' });
  const [formFinanzas, setFormFinanzas] = useState({ tipo: 'Gasto Local', descripcion: '', monto: '' });
  const [formEditStock, setFormEditStock] = useState({}); 

  const FUCSIA_PRINCIPAL = '#F786C1';

  // --- 📡 TIEMPO REAL (SUPABASE) ---
  useEffect(() => {
    document.title = "B J Importaciones | Panel Maestro";
    cargarTodo();
    const canal = supabase.channel('bj-ultra-master-v22')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ventas' }, () => cargarTodo())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'productos' }, () => cargarTodo())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'finanzas' }, () => cargarTodo())
      .subscribe();
    return () => { supabase.removeChannel(canal); };
  }, []);

  const cargarTodo = async () => {
    const { data: p } = await supabase.from('productos').select('*').order('created_at', { ascending: false });
    const { data: v } = await supabase.from('ventas').select('*').order('created_at', { ascending: true });
    const { data: f } = await supabase.from('finanzas').select('*').order('created_at', { ascending: false });
    
    if (p) {
        setProductos(p);
        const cants = {}; const cols = {};
        p.forEach(prod => { 
            cants[prod.id] = 1; 
            cols[prod.id] = prod.colores?.split(',')[0].trim() || 'N/A'; 
        });
        setCantidades(prev => ({ ...cants, ...prev }));
        setColoresElegidos(prev => ({ ...cols, ...prev }));
    }
    if (v) setVentas(v);
    if (f) setFinanzas(f);
  };

  // --- 🚚 LÓGICA LOGÍSTICA ---
  const pendientesAlmacen = useMemo(() => {
    const pend = ventas.filter(v => v.estado_pedido === 'En Almacén');
    const grupos = {};
    pend.forEach(v => {
      const key = `${v.cliente_nombre}-${v.localidad}`;
      if (!grupos[key]) grupos[key] = { cliente: v.cliente_nombre, localidad: v.localidad, telefono: v.telefono, items: [], totalVenta: 0 };
      grupos[key].items.push(v);
      grupos[key].totalVenta += (v.precio_venta_unitario * v.cantidad);
    });
    return Object.values(grupos);
  }, [ventas]);

  // --- 💰 LÓGICA CONTABLE Y CRM ---
  const historialVentasHoy = useMemo(() => {
    const filtradas = ventas.filter(v => getFechaPeru(v.created_at) === fechaConsulta);
    const grupos = {};
    filtradas.forEach(v => {
      const key = `${v.cliente_nombre}-${v.localidad}`;
      if (!grupos[key]) grupos[key] = { id_principal: v.id, cliente_nombre: v.cliente_nombre, localidad: v.localidad, telefono: v.telefono, total: 0, items: [] };
      grupos[key].items.push(v);
      grupos[key].total += (v.precio_venta_unitario * v.cantidad);
    });
    return Object.values(grupos).reverse();
  }, [ventas, fechaConsulta]);

  const totalesCajaHoy = useMemo(() => {
    const hoy = getFechaPeru();
    const vHoy = ventas.filter(v => getFechaPeru(v.created_at) === hoy);
    return { 
      caja: vHoy.reduce((acc, v) => acc + (v.precio_venta_unitario * v.cantidad), 0),
      ganancia: vHoy.reduce((acc, v) => acc + v.ganancia_total, 0)
    };
  }, [ventas]);

  const balanceFinancieroGlobal = useMemo(() => {
    const egresos = finanzas.filter(f => f.tipo === 'Gasto Local' || f.tipo === 'Inversión (Mercadería)' || f.tipo === 'Retiro Personal').reduce((acc, f) => acc + Number(f.monto), 0);
    const extras = finanzas.filter(f => f.tipo === 'Ingreso Adicional' || f.tipo === 'Inversión Inicial').reduce((acc, f) => acc + Number(f.monto), 0);
    const ventasBrutas = ventas.reduce((acc, v) => acc + (v.precio_venta_unitario * v.cantidad), 0);
    const gananciaNetaReal = ventas.reduce((acc, v) => acc + v.ganancia_total, 0);
    return { gastos: egresos, ingresosExtras: extras, gananciaNetaReal, cajaActualEfectivo: ventasBrutas + extras - egresos };
  }, [finanzas, ventas]);

  const statsValorInventario = useMemo(() => {
    let costoTotal = 0; let ventaTotal = 0; let unidadesTotal = 0;
    productos.forEach(p => { 
      if (p.stock > 0) { 
        costoTotal += (Number(p.precio_compra) * p.stock); 
        ventaTotal += (Number(p.precio_venta) * p.stock); 
        unidadesTotal += p.stock; 
      } 
    });
    return { costoTotal, ventaTotal, unidadesTotal, gananciaPotencial: ventaTotal - costoTotal };
  }, [productos]);

  const dataGraficoRetorno = [
    { nombre: 'Inversión (Costo)', valor: statsValorInventario.costoTotal, fill: '#1E1B1C' },
    { nombre: 'Retorno (Venta)', valor: statsValorInventario.ventaTotal, fill: FUCSIA_PRINCIPAL }
  ];

  // --- 🛠️ ACCIONES DE VENTA ---
  const handleClienteChange = (e) => {
    const nom = e.target.value; setCliente(nom);
    const c = ventas.find(v => v.cliente_nombre.toLowerCase() === nom.toLowerCase());
    if (c) { setLocalidad(c.localidad || ''); setTelefono(c.telefono || ''); }
  };

  const agregarAlCarrito = (p) => {
    const cant = cantidades[p.id] || 1;
    const precioBase = tipoVenta === 'Mayor' ? p.precio_venta : (p.precio_menor || p.precio_venta);
    const enC = carrito.filter(i => i.producto_id === p.id).reduce((acc, i) => acc + i.cantidad, 0);
    if (p.stock < cant + enC) return alert(`¡Stock insuficiente en almacén!`);
    setCarrito([...carrito, { 
      producto_id: p.id, 
      nombre: p.nombre, 
      cantidad: cant, 
      color: coloresElegidos[p.id], 
      precio_venta: precioBase, 
      precio_compra: p.precio_compra 
    }]);
  };

  const actualizarPrecioCarrito = (idx, valorBruto) => {
    const limpio = handleInputMonto(valorBruto);
    const nuevo = [...carrito];
    nuevo[idx].precio_venta = limpio;
    setCarrito(nuevo);
  };

  const finalizarVentaLote = async (estado = 'Entregado') => {
    if (!cliente || !localidad) return alert("Por favor completa Nombre y Zona.");
    const totalBruto = carrito.reduce((acc, i) => acc + (Number(i.precio_venta) * i.cantidad), 0);
    const ratioDesc = totalBruto > 0 ? (Number(descuento) / totalBruto) : 0;

    const inserts = carrito.map(i => {
      const pUnitario = Number(i.precio_venta);
      const subTotalItem = pUnitario * i.cantidad;
      const descuentoItem = subTotalItem * ratioDesc;
      return { 
        cliente_nombre: cliente, localidad, telefono: telefono || '', producto_id: i.producto_id, 
        cantidad: i.cantidad, color: i.color, precio_venta_unitario: pUnitario, 
        precio_costo_unitario: i.precio_compra, 
        ganancia_total: ((pUnitario - i.precio_compra) * i.cantidad) - descuentoItem, 
        estado_pedido: estado 
      };
    });

    const { error } = await supabase.from('ventas').insert(inserts);
    if (!error) {
      for (const i of carrito) {
        const pr = productos.find(p => p.id === i.producto_id);
        await supabase.from('productos').update({ stock: pr.stock - i.cantidad }).eq('id', i.producto_id);
      }
      setCliente(''); setLocalidad(''); setTelefono(''); setCarrito([]); setDescuento(0);
      alert("¡Venta procesada con éxito!");
    }
  };

  // --- 🛠️ ACCIONES DE GESTIÓN ---
  const guardarAjusteStock = async (p) => {
    const nuevoStock = formEditStock[p.id] !== undefined ? formEditStock[p.id] : p.stock;
    await supabase.from('productos').update({ stock: nuevoStock }).eq('id', p.id);
    alert("Stock sincronizado.");
  };

  const eliminarProducto = async (p) => {
    if (confirm(`¿Eliminar ${p.nombre} definitivamente del catálogo?`)) {
      await supabase.from('productos').delete().eq('id', p.id);
    }
  };

  const guardarCambiosFinanza = async () => {
    const montoLimpio = handleInputMonto(String(formEditFinanza.monto));
    await supabase.from('finanzas').update({ 
        tipo: formEditFinanza.tipo, 
        descripcion: formEditFinanza.descripcion, 
        monto: Number(montoLimpio) 
    }).eq('id', idFinanzaEditando);
    setIdFinanzaEditando(null);
    alert("Gasto actualizado.");
  };

  const exportarExcelCierre = () => {
    let csv = "data:text/csv;charset=utf-8,Fecha,Cliente,Localidad,Estado,Producto,Cantidad,Precio_Unit,Total\n";
    ventas.filter(v => getFechaPeru(v.created_at) === fechaConsulta).forEach(v => {
      const nomP = productos.find(p=>p.id===v.producto_id)?.nombre || "Producto Borrado";
      csv += `${getFechaPeru(v.created_at)},${v.cliente_nombre},${v.localidad},${v.estado_pedido},${nomP},${v.cantidad},${v.precio_venta_unitario},${(v.precio_venta_unitario*v.cantidad).toFixed(2)}\n`;
    });
    const encodedUri = encodeURI(csv);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Cierre_BJ_${fechaConsulta}.csv`);
    document.body.appendChild(link);
    link.click();
  };

  // --- 🎨 COMPONENTES DE ESTILO ---
  const inputEstiloBJ = { padding: '14px', borderRadius: '12px', border: `2px solid #FCC2E2`, width: '100%', outline: 'none', fontSize: '15px', boxSizing: 'border-box', backgroundColor: '#fff' };
  const cardCristalBJ = { backgroundColor: '#ffffff', borderRadius: '22px', padding: '20px', boxShadow: `0 10px 20px -5px rgba(247, 134, 193, 0.15)`, border: '1px solid #FFF1F2' };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#FFF5F7', color: '#1E1B1C', fontFamily: 'system-ui, sans-serif' }}>
      
      {/* 🚀 CABECERA DINÁMICA */}
      <header style={{ backgroundColor: '#ffffff', padding: '15px 5%', position: 'sticky', top: 0, zIndex: 100, display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: `0 4px 10px rgba(0,0,0,0.05)`, flexWrap: 'wrap', gap: '15px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ backgroundColor: FUCSIA_PRINCIPAL, color: '#fff', width: '40px', height: '40px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '1.2rem' }}>BJ</div>
          <h1 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '900', color: FUCSIA_PRINCIPAL, letterSpacing: '-0.5px' }}>B J IMPORTACIONES</h1>
        </div>
        <nav style={{ display: 'flex', gap: '8px', backgroundColor: `#FCA5D420`, padding: '5px', borderRadius: '14px' }}>
          <button onClick={() => setVista('ventas')} style={{ backgroundColor: vista === 'ventas' ? FUCSIA_PRINCIPAL : 'transparent', border: 'none', color: vista === 'ventas' ? '#fff' : FUCSIA_PRINCIPAL, padding: '10px 18px', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px', transition: '0.3s' }}>VENTAS</button>
          <button onClick={() => setVista('logistica')} style={{ backgroundColor: vista === 'logistica' ? '#1E1B1C' : 'transparent', border: 'none', color: vista === 'logistica' ? '#fff' : '#1E1B1C', padding: '10px 18px', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px', transition: '0.3s' }}>LOGÍSTICA</button>
          <button onClick={() => setVista('contabilidad')} style={{ backgroundColor: vista === 'contabilidad' ? FUCSIA_PRINCIPAL : 'transparent', border: 'none', color: vista === 'contabilidad' ? '#fff' : FUCSIA_PRINCIPAL, padding: '10px 18px', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px', transition: '0.3s' }}>GESTIÓN</button>
        </nav>
      </header>

      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px 15px' }}>
        
        {/* ===================== [1] VISTA VENTAS ===================== */}
        {vista === 'ventas' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
            
            {/* RESUMEN CAJA RÁPIDO */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
              <div style={cardCristalBJ}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: FUCSIA_PRINCIPAL, fontWeight: '900', fontSize: '12px', textTransform: 'uppercase' }}>💰 Caja Hoy</span>
                  <button onClick={exportarExcelCierre} style={{ backgroundColor: `#FCA5D430`, border: 'none', padding: '6px 12px', borderRadius: '8px', color: FUCSIA_PRINCIPAL, cursor: 'pointer', fontWeight: '900', fontSize: '10px' }}>CIERRE DE CAJA</button>
                </div>
                <h2 style={{ margin: '10px 0', fontSize: '2.8rem', fontWeight: '800' }}>S/ {totalesCajaHoy.caja.toFixed(2)}</h2>
                <div style={{ color: '#16A34A', fontWeight: 'bold', fontSize: '14px', backgroundColor: '#F0FDF4', padding: '5px 10px', borderRadius: '8px', display: 'inline-block' }}>Ganancia Estimada: S/ {totalesCajaHoy.ganancia.toFixed(2)}</div>
              </div>
              <div style={cardCristalBJ}>
                <span style={{ color: FUCSIA_PRINCIPAL, fontWeight: '900', fontSize: '12px', textTransform: 'uppercase' }}>📅 Historial por Fecha</span>
                <input type="date" value={fechaConsulta} onChange={e => setFechaConsulta(e.target.value)} style={{ ...inputEstiloBJ, marginTop: '10px', padding: '10px' }} />
              </div>
            </div>

            {/* BOX DE NUEVO PEDIDO */}
            <div style={{ ...cardCristalBJ, border: `2px solid #FCA5D4` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ margin: 0, color: FUCSIA_PRINCIPAL, fontSize: '1.2rem' }}>🛒 Registrar Nuevo Pedido</h3>
                <div style={{ display: 'flex', backgroundColor: '#F3F4F6', borderRadius: '12px', padding: '4px' }}>
                  <button onClick={() => setTipoVenta('Mayor')} style={{ border: 'none', padding: '8px 16px', borderRadius: '10px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', backgroundColor: tipoVenta === 'Mayor' ? FUCSIA_PRINCIPAL : 'transparent', color: tipoVenta === 'Mayor' ? '#fff' : '#666', transition: '0.2s' }}>MAYORISTA</button>
                  <button onClick={() => setTipoVenta('Menor')} style={{ border: 'none', padding: '8px 16px', borderRadius: '10px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', backgroundColor: tipoVenta === 'Menor' ? '#1E1B1C' : 'transparent', color: tipoVenta === 'Menor' ? '#fff' : '#666', transition: '0.2s' }}>MINORISTA</button>
                </div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '20px' }}>
                <div style={{ position:'relative' }}>
                    <input list="clientes_list" placeholder="👤 Nombre del Cliente" value={cliente} onChange={handleClienteChange} style={inputEstiloBJ} />
                    <datalist id="clientes_list">{[...new Set(ventas.map(v => v.cliente_nombre))].map((c, i) => <option key={i} value={c} />)}</datalist>
                </div>
                <input placeholder="📱 WhatsApp (Sin +51)" value={telefono} onChange={e => setTelefono(e.target.value)} style={inputEstiloBJ} />
                <input placeholder="📍 Pueblo / Zona / Distrito" value={localidad} onChange={e => setLocalidad(e.target.value)} style={inputEstiloBJ} />
              </div>

              {/* CARRITO INTERACTIVO */}
              {carrito.length > 0 && (
                <div style={{ backgroundColor: '#FFF5F7', border: `2px solid ${FUCSIA_PRINCIPAL}`, borderRadius: '20px', padding: '20px', marginBottom: '25px', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {carrito.map((item, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '14px', borderBottom: '1px solid #FCC2E2', paddingBottom: '10px' }}>
                        <div style={{ flex: 1 }}>
                            <strong style={{ color: '#1E1B1C' }}>{item.cantidad}x</strong> {item.nombre} 
                            <br/><small style={{ color: FUCSIA_PRINCIPAL, fontWeight: 'bold' }}>Color: {item.color}</small>
                        </div>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', backgroundColor: '#fff', padding: '5px 10px', borderRadius: '10px', border: '1px solid #FCA5D4' }}>
                             <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748B' }}>S/</span>
                             <input 
                                type="text" 
                                value={item.precio_venta} 
                                onChange={(e) => actualizarPrecioCarrito(idx, e.target.value)} 
                                style={{ width: '65px', border: 'none', outline: 'none', textAlign: 'center', fontSize: '14px', fontWeight: '800', color: '#1E1B1C' }} 
                             />
                          </div>
                          <button onClick={() => { const n = [...carrito]; n.splice(idx, 1); setCarrito(n); }} style={{ color: '#fff', backgroundColor: FUCSIA_PRINCIPAL, border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>X</button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ textAlign: 'right', marginTop: '20px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '5px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748B' }}>DSCTO ADICIONAL: S/</span>
                        <input type="text" value={descuento} onChange={e=>setDescuento(handleInputMonto(e.target.value))} style={{ width: '90px', padding: '8px', borderRadius: '10px', border: `1px solid ${FUCSIA_PRINCIPAL}`, textAlign: 'center', fontWeight: 'bold' }} />
                    </div>
                    <h3 style={{ margin: '10px 0', fontSize: '1.5rem', color: '#1E1B1C' }}>Total: S/ {(carrito.reduce((acc, i) => acc + (Number(i.precio_venta) * i.cantidad), 0) - Number(descuento)).toFixed(2)}</h3>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '10px' }}>
                    <button onClick={() => finalizarVentaLote('Entregado')} style={{ backgroundColor: '#1E1B1C', color: '#fff', border: 'none', padding: '16px', borderRadius: '14px', fontWeight: '900', cursor: 'pointer', fontSize: '14px', boxShadow: '0 4px 10px rgba(0,0,0,0.2)' }}>✅ COBRAR Y ENTREGAR</button>
                    <button onClick={() => finalizarVentaLote('En Almacén')} style={{ backgroundColor: FUCSIA_PRINCIPAL, color: '#fff', border: 'none', padding: '16px', borderRadius: '14px', fontWeight: '900', cursor: 'pointer', fontSize: '14px', boxShadow: `0 4px 10px ${FUCSIA_PRINCIPAL}40` }}>📦 PAGADO - EN ALMACÉN</button>
                  </div>
                </div>
              )}

              {/* CATÁLOGO DE PRODUCTOS */}
              <div style={{ marginBottom: '15px', position: 'relative' }}>
                <input placeholder="🔍 ¿Qué producto buscas hoy?..." value={busqueda} onChange={e => setBusqueda(e.target.value)} style={{ ...inputEstiloBJ, paddingLeft: '45px' }} />
                <span style={{ position: 'absolute', left: '15px', top: '14px', fontSize: '1.2rem' }}>🔍</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '18px', maxHeight: '550px', overflowY: 'auto', padding: '5px' }}>
                {productos.filter(p => p.nombre.toLowerCase().includes(busqueda.toLowerCase())).map((p) => {
                  const etiqueta = getEtiquetaProducto(p.created_at);
                  const pAMostrar = tipoVenta === 'Mayor' ? p.precio_venta : (p.precio_menor || p.precio_venta);
                  const isLowStock = p.stock < 5;

                  return (
                    <div key={p.id} style={{ border: '1px solid #FFF1F2', padding: '18px', borderRadius: '24px', backgroundColor: '#fff', position: 'relative', boxShadow: '0 5px 15px rgba(0,0,0,0.03)', transition: '0.3s' }}>
                      {etiqueta && <span style={{ position:'absolute', top: '-10px', left: '12px', backgroundColor: etiqueta.color, color: '#fff', fontSize: '10px', padding: '4px 10px', borderRadius: '12px', fontWeight: '900', zIndex: 10, boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>{etiqueta.tipo} {etiqueta.icono}</span>}
                      
                      <strong style={{ display: 'block', height: '40px', overflow: 'hidden', fontSize: '14px', lineHeight: '1.2', color: '#1E1B1C', marginBottom: '8px' }}>{p.nombre}</strong>
                      
                      <div style={{ margin: '10px 0', padding: '6px', backgroundColor: isLowStock ? '#FFF1F2' : '#F0FDF4', borderRadius: '10px', textAlign: 'center' }}>
                        <span style={{ fontSize: '11px', fontWeight: '900', color: isLowStock ? '#E11D48' : '#16A34A' }}>STOCK: {p.stock} {p.stock === 0 ? '🚫' : ''}</span>
                      </div>

                      <select value={coloresElegidos[p.id]} onChange={e => setColoresElegidos({...coloresElegidos, [p.id]: e.target.value})} style={{ ...inputEstiloBJ, padding: '6px', fontSize: '12px', marginBottom: '12px', border: '1px solid #E2E8F0' }}>
                        {p.colores?.split(',').map(c => <option key={c} value={c.trim()}>{c.trim()}</option>)}
                      </select>
                      
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', marginBottom: '15px', alignItems: 'center' }}>
                        <button onClick={() => setCantidades({...cantidades, [p.id]: Math.max(1, (cantidades[p.id] || 1) - 1)})} style={{ border: '1px solid #E2E8F0', background: '#fff', borderRadius: '10px', width: '35px', height: '35px', cursor: 'pointer', fontWeight: 'bold' }}>-</button>
                        <span style={{ fontWeight: '900', fontSize: '16px' }}>{cantidades[p.id] || 1}</span>
                        <button onClick={() => setCantidades({...cantidades, [p.id]: Math.min(p.stock, (cantidades[p.id] || 1) + 1)})} style={{ border: '1px solid #E2E8F0', background: '#fff', borderRadius: '10px', width: '35px', height: '35px', cursor: 'pointer', fontWeight: 'bold' }}>+</button>
                      </div>

                      <button onClick={() => agregarAlCarrito(p)} disabled={p.stock <= 0} style={{ width: '100%', backgroundColor: tipoVenta === 'Mayor' ? '#1E1B1C' : '#A13C6D', color: '#fff', border: 'none', padding: '12px', borderRadius: '15px', fontSize: '12px', fontWeight: '900', cursor:'pointer', transition: '0.2s' }}>
                        {p.stock > 0 ? `AÑADIR S/ ${Number(pAMostrar).toFixed(2)}` : 'AGOTADO'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* HISTORIAL DE VENTAS DEL DÍA SELECCIONADO */}
            <div style={cardCristalBJ}>
              <h4 style={{ margin: 0, marginBottom: '20px', color: '#64748B', textTransform: 'uppercase', fontSize: '12px', letterSpacing: '1px' }}>Ventas del Día Seleccionado</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {historialVentasHoy.length === 0 ? <p style={{ textAlign: 'center', opacity: 0.5 }}>No hay ventas registradas en esta fecha.</p> : historialVentasHoy.map(grupo => (
                  <div key={grupo.id_principal} style={{ padding: '20px', backgroundColor: '#FFF5F7', borderRadius: '22px', border: `1px solid #FCC2E2` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                      <div>
                        <strong style={{ color: FUCSIA_PRINCIPAL, fontSize: '18px' }}>{grupo.cliente_nombre}</strong>
                        <br/><small style={{ fontWeight: 'bold', color: '#64748B' }}>📍 {grupo.localidad}</small>
                      </div>
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                         <div style={{ backgroundColor: '#16A34A', color: '#fff', padding: '6px 15px', borderRadius: '12px', fontWeight: '900', fontSize: '14px' }}>S/ {grupo.total.toFixed(2)}</div>
                         <button onClick={() => {
                           let m = `¡Hola *${grupo.cliente_nombre}*! 👋 Aquí tienes el resumen de tu compra en B J Importaciones Chiclayo.%0A%0A`;
                           grupo.items.forEach(v => { m += `- ${v.cantidad}x ${productos.find(p=>p.id===v.producto_id)?.nombre} (${v.color}): S/ ${(v.precio_venta_unitario*v.cantidad).toFixed(2)}%0A`; });
                           m += `%0A*TOTAL PAGADO: S/ ${grupo.total.toFixed(2)}*%0A¡Gracias por tu preferencia! 😊`;
                           window.open(`https://wa.me/51${grupo.telefono.replace(/\D/g,'')}?text=${m}`, '_blank');
                         }} style={{ backgroundColor: '#25D366', color: '#fff', border: 'none', padding: '8px', borderRadius: '12px', cursor:'pointer' }}>📱 TICKET</button>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {grupo.items.map(v => (
                        <div key={v.id} style={{ backgroundColor: '#fff', padding: '12px', borderRadius: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontSize: '13px' }}>
                                <strong>{v.cantidad}x</strong> {productos.find(p => p.id === v.producto_id)?.nombre} 
                                <br/><small style={{ fontWeight:'bold' }}>{v.color} | {v.estado_pedido==='En Almacén' ? '📦 ALMACÉN' : '✅ ENTREGADO'}</small>
                            </div>
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                <span style={{ fontWeight: '800' }}>S/ {(v.precio_venta_unitario * v.cantidad).toFixed(2)}</span>
                                <button onClick={() => borrarVenta(v)} style={{ border:'none', background:'none', color: FUCSIA_PRINCIPAL, cursor:'pointer', fontSize: '18px' }}>🗑️</button>
                            </div>
                        </div>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ===================== [2] VISTA LOGÍSTICA ===================== */}
        {vista === 'logistica' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
            <div style={{ ...cardCristalBJ, backgroundColor: '#1E1B1C', color: '#fff', padding: '30px' }}>
                <h2 style={{ margin: 0, fontSize: '2rem' }}>📦 Pendientes de Entrega</h2>
                <p style={{ opacity: 0.8, fontSize: '14px' }}>Listado global de mercadería ya pagada que sigue guardada en almacén.</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '25px' }}>
                {pendientesAlmacen.length === 0 ? <div style={{textAlign:'center', padding:'100px', opacity:0.3, gridColumn: '1/-1'}}><h3>No hay pendientes en almacén. ✨</h3></div> : pendientesAlmacen.map((grupo, idx) => (
                    <div key={idx} style={{ ...cardCristalBJ, borderLeft: `10px solid ${FUCSIA_PRINCIPAL}` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                            <div>
                                <h3 style={{ margin: 0, color: FUCSIA_PRINCIPAL, fontSize: '1.4rem' }}>{grupo.cliente}</h3>
                                <p style={{ fontSize: '13px', color: '#64748B', fontWeight:'bold', margin: '5px 0' }}>📍 {grupo.localidad}</p>
                            </div>
                            <button onClick={() => {
                                let m = `¡Hola *${grupo.cliente}*! 👋 Te recordamos que tienes mercadería pendiente por recoger en B J Importaciones. ¡Te esperamos! 📦✨`;
                                window.open(`https://wa.me/51${grupo.telefono.replace(/\D/g,'')}?text=${m}`, '_blank');
                            }} style={{ backgroundColor: '#25D366', color: '#fff', border: 'none', padding: '10px 15px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}>AVISAR WhatsApp</button>
                        </div>
                        <div style={{ backgroundColor: '#F8FAFC', borderRadius: '18px', padding: '15px', marginBottom: '20px' }}>
                            {grupo.items.map((it, iIdx) => (
                                <div key={iIdx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', padding: '8px 0', borderBottom: iIdx === grupo.items.length - 1 ? 'none' : '1px solid #E2E8F0' }}>
                                    <span><strong>{it.cantidad}x</strong> {productos.find(p=>p.id===it.producto_id)?.nombre} <br/><small>Color: {it.color}</small></span>
                                    <strong style={{ alignSelf: 'center' }}>S/ {(it.precio_venta_unitario * it.cantidad).toFixed(2)}</strong>
                                </div>
                            ))}
                            <div style={{textAlign:'right', marginTop:'15px', borderTop:'2px solid #E2E8F0', paddingTop: '10px', fontSize: '1.1rem'}}>
                                <small style={{ fontWeight:'bold', color: '#64748B' }}>TOTAL PAGADO: </small>
                                <strong style={{ color: '#16A34A' }}>S/ {grupo.totalVenta.toFixed(2)}</strong>
                            </div>
                        </div>
                        <button onClick={async () => { if(confirm("¿Confirmas que ya entregaste toda esta mercadería?")) { for(let i of grupo.items) await supabase.from('ventas').update({estado_pedido:'Entregado'}).eq('id', i.id); alert("¡Pedido marcado como entregado!"); } }} style={{ width: '100%', backgroundColor: '#1E1B1C', color: '#fff', border: 'none', padding: '18px', borderRadius: '16px', fontWeight: '900', cursor: 'pointer', fontSize: '14px' }}>
                            ✅ MARCAR TODO COMO ENTREGADO
                        </button>
                    </div>
                ))}
            </div>
          </div>
        )}

        {/* ===================== [3] VISTA GESTIÓN ===================== */}
        {vista === 'contabilidad' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
            
            {/* PANEL DE VALORIZACIÓN DE CAPITAL */}
            <div style={{ ...cardCristalBJ, border: `2px solid ${FUCSIA_PRINCIPAL}`, backgroundColor: '#FFF' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h3 style={{ margin: 0, color: FUCSIA_PRINCIPAL }}>📊 Valorización Actual del Negocio</h3>
                    <div style={{ backgroundColor: FUCSIA_PRINCIPAL, color: '#fff', padding: '5px 15px', borderRadius: '10px', fontSize: '12px', fontWeight: 'bold' }}>{statsValorInventario.unidadesTotal} UNIDADES EN TOTAL</div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '25px' }}>
                    <div style={{ backgroundColor: '#F8FAFC', padding: '15px', borderRadius: '18px' }}>
                        <small style={{ fontWeight: 'bold', color: '#64748B', display: 'block', marginBottom: '5px' }}>CAPITAL INVERTIDO (COSTO)</small>
                        <h3 style={{ margin: 0, fontSize: '1.8rem', color: '#1E1B1C' }}>S/ {statsValorInventario.costoTotal.toLocaleString('es-PE', {minimumFractionDigits:2})}</h3>
                        <p style={{ margin: '5px 0 0', fontSize: '11px', opacity: 0.6 }}>Dinero real que tienes hoy en mercadería.</p>
                    </div>
                    <div style={{ backgroundColor: '#FFF1F2', padding: '15px', borderRadius: '18px' }}>
                        <small style={{ fontWeight: 'bold', color: FUCSIA_PRINCIPAL, display: 'block', marginBottom: '5px' }}>RETORNO ESTIMADO (VENTA)</small>
                        <h3 style={{ margin: 0, fontSize: '1.8rem', color: FUCSIA_PRINCIPAL }}>S/ {statsValorInventario.ventaTotal.toLocaleString('es-PE', {minimumFractionDigits:2})}</h3>
                        <p style={{ margin: '5px 0 0', fontSize: '11px', opacity: 0.6 }}>Dinero que recibirás al vender todo (Mayorista).</p>
                    </div>
                    <div style={{ backgroundColor: '#F0FDF4', padding: '15px', borderRadius: '18px' }}>
                        <small style={{ fontWeight: 'bold', color: '#16A34A', display: 'block', marginBottom: '5px' }}>UTILIDAD PROYECTADA</small>
                        <h3 style={{ margin: 0, fontSize: '1.8rem', color: '#16A34A' }}>S/ {statsValorInventario.gananciaPotencial.toLocaleString('es-PE', {minimumFractionDigits:2})}</h3>
                        <p style={{ margin: '5px 0 0', fontSize: '11px', opacity: 0.6 }}>Tu margen de ganancia libre al liquidar stock.</p>
                    </div>
                </div>
            </div>

            {/* BALANCE FINANCIERO */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '15px' }}>
              <div style={{ ...cardCristalBJ, borderLeft: `6px solid ${FUCSIA_PRINCIPAL}` }}><small style={{ fontWeight: 'bold', opacity: 0.7 }}>GASTOS / COMPRAS</small><h4 style={{ fontSize: '1.4rem', margin: '5px 0' }}>S/ {balanceFinancieroGlobal.gastos.toFixed(2)}</h4></div>
              <div style={{ ...cardCristalBJ, borderLeft: '6px solid #16A34A' }}><small style={{ fontWeight: 'bold', opacity: 0.7 }}>INGRESOS EXTRAS</small><h4 style={{ fontSize: '1.4rem', margin: '5px 0' }}>S/ {balanceFinancieroGlobal.ingresosExtras.toFixed(2)}</h4></div>
              <div style={{ ...cardCristalBJ, borderLeft: '6px solid #3B82F6' }}><small style={{ fontWeight: 'bold', opacity: 0.7 }}>GANANCIA NETA REAL</small><h4 style={{ fontSize: '1.4rem', margin: '5px 0' }}>S/ {balanceFinancieroGlobal.gananciaNetaReal.toFixed(2)}</h4></div>
              <div style={{ ...cardCristalBJ, backgroundColor: FUCSIA_PRINCIPAL, color: '#fff' }}><small style={{ fontWeight: 'bold' }}>EFECTIVO EN CAJA</small><h4 style={{ fontSize: '1.4rem', margin: '5px 0' }}>S/ {balanceFinancieroGlobal.cajaActualEfectivo.toFixed(2)}</h4></div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '25px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
                
                {/* REGISTRAR MOVIMIENTO */}
                <div style={cardCristalBJ}>
                  <h4 style={{ marginTop: 0, marginBottom: '15px' }}>💸 Registrar Gasto / Ingreso Extra</h4>
                  <form onSubmit={async (e) => { e.preventDefault(); await supabase.from('finanzas').insert([{...formFinanzas, monto: Number(handleInputMonto(formFinanzas.monto))}]); setFormFinanzas({tipo:'Gasto Local', descripcion:'', monto:''}); }} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <select value={formFinanzas.tipo} onChange={e => setFormFinanzas({...formFinanzas, tipo: e.target.value})} style={inputEstiloBJ}>
                      <option value="Gasto Local">🏪 Gasto Local (Luz, Alquiler, etc.)</option>
                      <option value="Inversión (Mercadería)">📦 Inversión (Compra de Mercadería)</option>
                      <option value="Retiro Personal">🏧 Retiro Personal</option>
                      <option value="Ingreso Adicional">💰 Ingreso Adicional</option>
                      <option value="Inversión Inicial">💵 Inversión Inicial (Capital)</option>
                    </select>
                    <input placeholder="Descripción del movimiento" value={formFinanzas.descripcion} onChange={e => setFormFinanzas({...formFinanzas, descripcion: e.target.value})} style={inputEstiloBJ} />
                    <input type="text" placeholder="Monto S/" value={formFinanzas.monto} onChange={e => setFormFinanzas({...formFinanzas, monto: handleInputMonto(e.target.value)})} style={inputEstiloBJ} />
                    <button type="submit" style={{ backgroundColor: FUCSIA_PRINCIPAL, color: '#fff', border: 'none', padding: '16px', borderRadius: '15px', fontWeight: 'bold', cursor:'pointer' }}>GUARDAR MOVIMIENTO</button>
                  </form>
                </div>
                
                {/* CARGAR NUEVO PRODUCTO (Doble Precio) */}
                <div style={{ ...cardCristalBJ, border: `2px solid ${FUCSIA_PRINCIPAL}` }}>
                  <h4 style={{ marginTop: 0, marginBottom: '15px' }}>🆕 Cargar Nuevo Producto al Sistema</h4>
                  <form onSubmit={async (e) => { e.preventDefault(); await supabase.from('productos').insert([{...formProd, precio_compra: Number(handleInputMonto(formProd.precio_compra)), precio_venta: Number(handleInputMonto(formProd.precio_venta)), precio_menor: Number(handleInputMonto(formProd.precio_menor)), stock: Number(formProd.stock)}]); setFormProd({nombre:'', precio_compra:'', precio_venta:'', precio_menor:'', stock:'', colores:''}); alert("¡Producto cargado!"); }} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <input placeholder="Nombre del Modelo" value={formProd.nombre} onChange={e => setFormProd({...formProd, nombre: e.target.value})} style={inputEstiloBJ} />
                    <input placeholder="Colores (Separados por comas: Rojo, Azul, Negro)" value={formProd.colores} onChange={e => setFormProd({...formProd, colores: e.target.value})} style={inputEstiloBJ} />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <input type="text" placeholder="Costo S/" value={formProd.precio_compra} onChange={e => setFormProd({...formProd, precio_compra: handleInputMonto(e.target.value)})} style={inputEstiloBJ} />
                        <input type="number" placeholder="Stock Inicial" value={formProd.stock} onChange={e => setFormProd({...formProd, stock: e.target.value})} style={inputEstiloBJ} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <input type="text" placeholder="Precio MAYOR" value={formProd.precio_venta} onChange={e => setFormProd({...formProd, precio_venta: handleInputMonto(e.target.value)})} style={{...inputEstiloBJ, border:'2px solid #F786C1'}} />
                        <input type="text" placeholder="Precio MENOR" value={formProd.precio_menor} onChange={e => setFormProd({...formProd, precio_menor: handleInputMonto(e.target.value)})} style={{...inputEstiloBJ, border:'2px solid #1E1B1C'}} />
                    </div>
                    <button type="submit" style={{ backgroundColor: '#1E1B1C', color: '#fff', border: 'none', padding: '16px', borderRadius: '15px', fontWeight: '900', cursor:'pointer' }}>CREAR PRODUCTO</button>
                  </form>
                </div>
              </div>

              {/* COLUMNA DERECHA GESTIÓN */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
                
                {/* AJUSTE DE STOCK RÁPIDO */}
                <div style={cardCristalBJ}>
                  <h4 style={{ marginTop: 0, color: FUCSIA_PRINCIPAL, marginBottom: '15px' }}>🔧 Ajuste de Stock y Catálogo</h4>
                  <input placeholder="🔍 Buscar para editar stock o eliminar..." value={busquedaStock} onChange={e => setBusquedaStock(e.target.value)} style={{ ...inputEstiloBJ, padding: '12px', marginBottom: '15px', border: `2px solid ${FUCSIA_PRINCIPAL}` }} />
                  <div style={{ maxHeight: '450px', overflowY: 'auto' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {productos.filter(p => p.nombre.toLowerCase().includes(busquedaStock.toLowerCase())).map(p => {
                        const etiqueta = getEtiquetaProducto(p.created_at);
                        return (
                          <div key={p.id} style={{ padding: '15px', border: '1px solid #f1f1f1', borderRadius: '20px', backgroundColor: '#fff', boxShadow: '0 2px 5px rgba(0,0,0,0.02)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', alignItems: 'flex-start' }}>
                              <div style={{ flex:1 }}>
                                 <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    {etiqueta && <span style={{ backgroundColor: etiqueta.color, color:'#fff', fontWeight: 'bold', fontSize: '9px', padding: '2px 8px', borderRadius: '8px' }}>{etiqueta.icono} {etiqueta.tipo}</span>}
                                    <strong style={{ fontSize: '13px' }}>{p.nombre}</strong>
                                 </div>
                                 <small style={{ color: p.stock < 5 ? '#E11D48' : '#64748B', fontWeight: 'bold' }}>Quedan: {p.stock} unidades</small>
                              </div>
                              <button onClick={() => eliminarProducto(p)} style={{ background: 'none', border: 'none', color: '#CBD5E1', cursor:'pointer', fontSize: '1.2rem' }}>🗑️</button>
                            </div>
                            <div style={{ display: 'flex', gap: '10px', backgroundColor: '#F8FAFC', padding: '10px', borderRadius: '14px' }}>
                              <input type="number" value={formEditStock[p.id] !== undefined ? formEditStock[p.id] : p.stock} onChange={e => setFormEditStock({...formEditStock, [p.id]: Number(e.target.value)})} style={{ width: '70px', padding: '8px', borderRadius: '10px', border: '1px solid #CBD5E1', textAlign: 'center', fontSize: '14px', fontWeight: 'bold' }} />
                              <button onClick={() => guardarAjusteStock(p)} style={{ background: '#1E1B1C', color: '#fff', border: 'none', padding: '8px 20px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold', cursor:'pointer' }}>GUARDAR</button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* LIBRO DIARIO COMPLETO (RESTAURADO) */}
                <div style={cardCristalBJ}>
                  <h4 style={{ marginTop: 0, marginBottom: '15px' }}>📖 Libro Diario de Gastos / Ingresos</h4>
                  <div style={{ maxHeight: '450px', overflowY: 'auto' }}>
                    <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
                      <tbody>
                        {finanzas.map(f => (
                          <tr key={f.id} style={{ borderBottom: '1px solid #f9f9f9' }}>
                            {idFinanzaEditando === f.id ? (
                               <td colSpan="3" style={{ padding: '15px', backgroundColor: '#FFF5F7', borderRadius: '15px' }}>
                                  <select value={formEditFinanza.tipo} onChange={e=>setFormEditFinanza({...formEditFinanza, tipo:e.target.value})} style={{...inputEstiloBJ, padding:'8px', marginBottom: '5px'}}><option value="Gasto Local">Gasto Local</option><option value="Inversión (Mercadería)">Inversión (Mercadería)</option><option value="Retiro Personal">Retiro Personal</option><option value="Ingreso Adicional">Ingreso Adicional</option><option value="Inversión Inicial">Inversión Inicial</option></select>
                                  <input value={formEditFinanza.descripcion} onChange={e=>setFormEditFinanza({...formEditFinanza, descripcion:e.target.value})} style={{...inputEstiloBJ, padding:'8px', marginBottom: '5px'}} />
                                  <input type="text" value={formEditFinanza.monto} onChange={e=>setFormEditFinanza({...formEditFinanza, monto:handleInputMonto(e.target.value)})} style={{...inputEstiloBJ, padding:'8px'}} />
                                  <div style={{marginTop: '10px', display:'flex', gap:'10px'}}><button onClick={guardarCambiosFinanza} style={{backgroundColor:'#16A34A', color:'#fff', padding:'10px 20px', borderRadius:'10px', border:'none', cursor:'pointer', fontWeight:'bold'}}>OK</button><button onClick={()=>setIdFinanzaEditando(null)} style={{background:'none', border:'none', cursor:'pointer', fontWeight:'bold', color: FUCSIA_PRINCIPAL}}>X</button></div>
                               </td>
                            ) : (
                              <>
                                <td style={{ padding: '12px 5px' }}><small style={{fontWeight:'bold', color:FUCSIA_PRINCIPAL, textTransform:'uppercase', fontSize: '9px'}}>{f.tipo}</small><br/>{f.descripcion}</td>
                                <td style={{ textAlign: 'right', padding: '12px 5px', fontWeight: '900', color: f.tipo.includes('Ingreso') ? '#16A34A' : '#1E1B1C' }}>S/ {Number(f.monto).toFixed(2)}</td>
                                <td style={{ textAlign: 'right', padding: '12px 5px' }}>
                                  <button onClick={()=> { setIdFinanzaEditando(f.id); setFormEditFinanza({...f}); }} style={{background:'none', border:'none', cursor:'pointer', marginRight: '5px'}}>✏️</button>
                                  <button onClick={async ()=> { if(confirm("¿Borrar este registro?")) await supabase.from('finanzas').delete().eq('id', f.id); }} style={{background:'none', border:'none', color: FUCSIA_PRINCIPAL, cursor:'pointer'}}>🗑️</button>
                                </td>
                              </>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* GRÁFICO DE INVERSIÓN (RESTAURADO) */}
                <div style={cardCristalBJ}>
                  <h4 style={{ marginTop: 0, color: FUCSIA_PRINCIPAL, marginBottom: '15px' }}>📈 Retorno de Inversión</h4>
                  <div style={{ height: '220px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={dataGraficoRetorno}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F1F1" />
                        <XAxis dataKey="nombre" fontSize={10} fontWeight="bold" />
                        <YAxis fontSize={10} />
                        <Tooltip formatter={(val)=> `S/ ${val.toLocaleString()}`} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 5px 15px rgba(0,0,0,0.1)' }} />
                        <Bar dataKey="valor" radius={[10, 10, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div style={{ textAlign: 'center', marginTop: '10px' }}>
                    <small style={{ fontWeight: 'bold', color: '#64748B' }}>Diferencia: </small>
                    <strong style={{ color: '#16A34A' }}>+S/ {statsValorInventario.gananciaPotencial.toLocaleString()}</strong>
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}