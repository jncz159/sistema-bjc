"use client";
import React, { useState, useEffect, useMemo, dynamic } from 'react';
import { supabase } from './supabaseClient';
import { getFechaPeru, handleInputMonto } from '../lib/helpers';

// IMPORTACIÓN DINÁMICA DE COMPONENTES PARA EVITAR EL ERROR "PAGE COULDN'T LOAD"
const VentasSection = dynamic(() => import('../components/Ventas'), { ssr: false });
const AlmacenSection = dynamic(() => import('../components/Almacen'), { ssr: false });
const LogisticaSection = dynamic(() => import('../components/Logistica'), { ssr: false });
const GestionSection = dynamic(() => import('../components/Gestion'), { ssr: false });

export default function SistemaBJCMasterFinal() {
  const [productos, setProductos] = useState([]);
  const [ventas, setVentas] = useState([]);
  const [finanzas, setFinanzas] = useState([]);
  const [vista, setVista] = useState('ventas'); 
  const [cargando, setCargando] = useState(true);

  const [busqueda, setBusqueda] = useState(''); 
  const [busquedaStock, setBusquedaStock] = useState(''); 
  const [busquedaHistorial, setBusquedaHistorial] = useState('');
  const [fechaConsulta, setFechaConsulta] = useState(getFechaPeru());
  const [cliente, setCliente] = useState('');
  const [localidad, setLocalidad] = useState(''); 
  const [telefono, setTelefono] = useState(''); 
  const [tipoVenta, setTipoVenta] = useState('Mayor'); 
  const [cantidades, setCantidades] = useState({}); 
  const [coloresElegidos, setColoresElegidos] = useState({});
  const [carrito, setCarrito] = useState([]);
  const [descuento, setDescuento] = useState(0); 

  const [formProd, setFormProd] = useState({ nombre: '', precio_compra: '', precio_venta: '', precio_menor: '', stock: '', colores: '' });
  const [formFinanzas, setFormFinanzas] = useState({ tipo: 'Gasto Local', descripcion: '', monto: '', origen: 'Caja Global' });
  const [formEditStockBJ, setFormEditStockBJ] = useState({}); 

  const [idEditFinanza, setIdEditFinanza] = useState(null);
  const [formEditFinanza, setFormEditFinanza] = useState({});
  const [idEditProducto, setIdEditProducto] = useState(null);
  const [formEditProducto, setFormEditProducto] = useState({});

  const FUCSIA_PRINCIPAL = '#F01097';
  const VERDE_BJ = '#16A34A';
  const ROJO_BJ = '#E11D48';
  const AMARILLO_BJ = '#CA8A04';
  const OSCURO_BJ = '#1E1B1C';
  const styleInp = { padding: '16px', borderRadius: '16px', border: `2px solid #FCC2E2`, width: '100%', outline: 'none', fontSize: '15px', boxSizing: 'border-box', backgroundColor: '#fff' };
  const styleCrd = { backgroundColor: '#ffffff', borderRadius: '35px', padding: '35px', boxShadow: `0 20px 40px rgba(247, 134, 193, 0.1)`, border: '1px solid #FFF1F2' };

  const cargarTodoDesdeNube = async () => {
    try {
        const { data: p } = await supabase.from('productos').select('*').order('created_at', { ascending: false });
        const { data: v } = await supabase.from('ventas').select('*').order('created_at', { ascending: true });
        const { data: f } = await supabase.from('finanzas').select('*').order('created_at', { ascending: false });
        if (p) setProductos(p); if (v) setVentas(v); if (f) setFinanzas(f);
    } catch (e) { console.error(e); } finally { setCargando(false); }
  };

  useEffect(() => { cargarTodoDesdeNube(); }, []);

  const handleEjecutarVentaBJ = async (estado) => {
    if (!cliente || !localidad) return alert("Faltan datos");
    const totalV = carrito.reduce((acc, i) => acc + (Number(i.precio_venta)*i.cantidad), 0);
    const ratio = totalV > 0 ? (Number(descuento)/totalV) : 0;
    const lista = carrito.map(i => {
        let g = 0; if(Number(i.precio_venta) > 0) { g = (Number(i.precio_venta)*i.cantidad - (Number(i.precio_venta)*i.cantidad*ratio)) - (Number(i.precio_compra)*i.cantidad); }
        return { cliente_nombre: cliente, localidad, telefono, producto_id: i.producto_id, cantidad: i.cantidad, color: i.color, precio_venta_unitario: i.precio_venta, precio_costo_unitario: i.precio_compra, ganancia_total: g, estado_pedido: estado };
    });
    const { error } = await supabase.from('ventas').insert(lista);
    if (!error) {
        for (const it of carrito) {
            const pO = productos.find(p => p.id === it.producto_id);
            if (pO) await supabase.from('productos').update({ stock: pO.stock - it.cantidad }).eq('id', it.producto_id);
        }
        setCarrito([]); setCliente(''); setLocalidad(''); setTelefono(''); cargarTodoDesdeNube();
    }
  };

  const balanceEliteBJ = useMemo(() => {
    const s = { cH: 0, gH: 0, cG: 0, bR: 0, pe_p: 0, pe_g: 0, pe_m: 0 };
    if (!ventas.length && !finanzas.length) return s;
    const hoyS = getFechaPeru();
    const mesI = hoyS.substring(0,7);
    const vHoy = ventas.filter(v => getFechaPeru(v.created_at) === hoyS && v.estado_pedido !== 'Pendiente de Pago');
    const inV = ventas.filter(v => v.estado_pedido !== 'Pendiente de Pago').reduce((acc, v) => acc + (Number(v.precio_venta_unitario)*v.cantidad), 0);
    const inC = finanzas.filter(f => ['Ingreso Adicional','Inversión Inicial'].includes(f.tipo)).reduce((acc, f) => acc + Number(f.monto), 0);
    const outT = finanzas.filter(f => !['Ingreso Adicional','Inversión Inicial'].includes(f.tipo)).reduce((acc, f) => acc + Number(f.monto), 0);
    const utM = ventas.filter(v => getFechaPeru(v.created_at).substring(0,7) === mesI && v.estado_pedido !== 'Pendiente de Pago').reduce((acc, v) => acc + Number(v.ganancia_total), 0);
    const exM = finanzas.filter(f => getFechaPeru(f.created_at).substring(0,7) === mesI && ['Gasto Local','Retiro Personal'].includes(f.tipo)).reduce((acc, f) => acc + Number(f.monto), 0);
    return {
        cH: vHoy.reduce((acc, v) => acc + (Number(v.precio_venta_unitario)*v.cantidad), 0),
        gH: vHoy.reduce((acc, v) => acc + Number(v.ganancia_total), 0),
        cG: (inV + inC) - outT,
        bR: (ventas.reduce((acc, v) => acc + Number(v.ganancia_total), 0)) - (finanzas.filter(f => f.origen === 'Ganancias').reduce((acc, f) => acc + Number(f.monto), 0)),
        pe_p: exM > 0 ? (utM / exM) * 100 : 0, pe_g: utM, pe_m: exM
    };
  }, [ventas, finanzas]);

  const logisticaInteligente = useMemo(() => {
    const res = { almacen: [], deudas: [] };
    const mA = {}; const mD = {};
    ventas.forEach(v => {
        const key = `${v.cliente_nombre}-${v.localidad}`;
        const pM = productos.find(p => p.id === v.producto_id);
        const it = { nombre: pM?.nombre, cantidad: v.cantidad, color: v.color };
        if (v.estado_pedido === 'En Almacén') { if(!mA[key]) mA[key]={cliente:v.cliente_nombre, localidad:v.localidad, items:[], items_ids:[], total:0}; mA[key].items.push(it); mA[key].items_ids.push(v.id); mA[key].total += v.precio_venta_unitario*v.cantidad; }
        if (v.estado_pedido === 'Pendiente de Pago') { if(!mD[key]) mD[key]={cliente:v.cliente_nombre, localidad:v.localidad, items:[], items_ids:[], total:0}; mD[key].items.push(it); mD[key].items_ids.push(v.id); mD[key].total += v.precio_venta_unitario*v.cantidad; }
    });
    res.almacen = Object.values(mA); res.deudas = Object.values(mD);
    return res;
  }, [ventas, productos]);

  const analiticaProBJ = useMemo(() => {
    const c = {}; ventas.forEach(v => { const n = productos.find(p => p.id === v.producto_id)?.nombre || "Item"; c[n] = (c[n] || 0) + v.cantidad; });
    return { top: Object.entries(c).sort((a,b)=>b[1]-a[1]).slice(0,5) };
  }, [ventas, productos]);

  const handleAutocompleteCliente = (e) => {
    const valInput = e.target.value; setCliente(valInput);
    const mCli = ventas.find(v => v.cliente_nombre?.toLowerCase() === valInput.toLowerCase());
    if (mCli) { setLocalidad(mCli.localidad || ''); setTelefono(mCli.telefono || ''); }
  };

  const historialVentasDiaBJ = useMemo(() => {
    if (!ventas.length) return [];
    const filt = ventas.filter(v => getFechaPeru(v.created_at) === fechaConsulta && (v.cliente_nombre?.toLowerCase().includes(busquedaHistorial.toLowerCase()) || v.localidad?.toLowerCase().includes(busquedaHistorial.toLowerCase())));
    const agrup = {};
    filt.forEach(v => {
        const hId = `${v.cliente_nombre}-${v.localidad}-${v.created_at?.substring(0,16)}`; 
        if (!agrup[hId]) agrup[hId] = { id_grupo: hId, cliente_nombre: v.cliente_nombre, localidad: v.localidad, telefono: v.telefono, hora: getHoraPeru(v.created_at), total: 0, items: [] };
        agrup[hId].items.push(v); agrup[hId].total += (Number(v.precio_venta_unitario) * v.cantidad);
    });
    return Object.values(agrup).reverse();
  }, [ventas, fechaConsulta, busquedaHistorial]);

  if (cargando) return <div style={{ height:'100vh', display:'flex', alignItems:'center', justifyContent:'center', backgroundColor:'#FFF5F7', color:FUCSIA_PRINCIPAL, fontWeight:'900' }}>CARGANDO MODULOS BJ... 🚀</div>;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#FFF5F7', color: OSCURO_BJ, fontFamily: 'system-ui, sans-serif' }}>
      <header style={{ backgroundColor: '#ffffff', padding: '15px 5%', position: 'sticky', top: 0, zIndex: 100, display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: `0 4px 15px rgba(0,0,0,0.06)` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ backgroundColor: FUCSIA_PRINCIPAL, color: '#fff', width: '45px', height: '45px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900' }}>BJ</div>
          <div><h1 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '900', color: FUCSIA_PRINCIPAL }}>BJ IMPORTACIONES</h1><small style={{ color: '#64748B', fontWeight: '900', fontSize: '9px' }}>MODULAR ARCHITECTURE v104</small></div>
        </div>
        <nav style={{ display: 'flex', gap: '8px', backgroundColor: `#FCA5D415`, padding: '5px', borderRadius: '15px' }}>
          <button onClick={() => setVista('ventas')} style={{ backgroundColor: vista === 'ventas' ? FUCSIA_PRINCIPAL : 'transparent', border: 'none', color: vista === 'ventas' ? '#fff' : FUCSIA_PRINCIPAL, padding: '10px 15px', borderRadius: '10px', cursor: 'pointer', fontWeight: '900' }}>VENTAS</button>
          <button onClick={() => setVista('stock')} style={{ backgroundColor: vista === 'stock' ? FUCSIA_PRINCIPAL : 'transparent', border: 'none', color: vista === 'stock' ? '#fff' : FUCSIA_PRINCIPAL, padding: '10px 15px', borderRadius: '10px', cursor: 'pointer', fontWeight: '900' }}>ALMACÉN</button>
          <button onClick={() => setVista('logistica')} style={{ backgroundColor: vista === 'logistica' ? OSCURO_BJ : 'transparent', border: 'none', color: vista === 'logistica' ? '#fff' : OSCURO_BJ, padding: '10px 15px', borderRadius: '10px', cursor: 'pointer', fontWeight: '900' }}>LOGÍSTICA</button>
          <button onClick={() => setVista('contabilidad')} style={{ backgroundColor: vista === 'contabilidad' ? FUCSIA_PRINCIPAL : 'transparent', border: 'none', color: vista === 'contabilidad' ? '#fff' : FUCSIA_PRINCIPAL, padding: '10px 15px', borderRadius: '10px', cursor: 'pointer', fontWeight: '900' }}>GESTIÓN</button>
        </nav>
      </header>

      <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '30px 20px' }}>
        {vista === 'ventas' && <VentasSection {...{balanceEliteBJ, fechaConsulta, setFechaConsulta, handleExportarExcelCajaFull, tipoVenta, setTipoVenta, cliente, handleAutocompleteCliente, ventas, localidad, setLocalidad, telefono, setTelefono, carrito, setCarrito, descuento, setDescuento, handleEjecutarVentaBJ, busqueda, setBusqueda, productos, coloresElegidos, setColoresElegidos, cantidades, setCantidades, busquedaHistorial, setBusquedaHistorial, historialVentasDiaBJ, handleAnularVentaBJ: async (v)=>{ if(confirm("Anular?")){const pc=productos.find(p=>p.id===v.producto_id); if(pc)await supabase.from('productos').update({stock:pc.stock+v.cantidad}).eq('id',pc.id); await supabase.from('ventas').delete().eq('id',v.id); cargarTodoDesdeNube();}}, FUCSIA_PRINCIPAL, VERDE_BJ, ROJO_BJ, AMARILLO_BJ, OSCURO_BJ, styleInp, styleCrd}} />}
        {vista === 'stock' && <AlmacenSection {...{formProd, setFormProd, handleAddProductoBJ: async (e)=>{e.preventDefault(); const {error}=await supabase.from('productos').insert([{...formProd, precio_compra:Number(handleInputMonto(formProd.precio_compra)), precio_venta:Number(handleInputMonto(formProd.precio_venta)), precio_menor:Number(handleInputMonto(formProd.precio_menor)) }]); if(!error){setFormProd({nombre:'', precio_compra:'', precio_venta:'', precio_menor:'', stock:'', colores:''}); cargarTodoDesdeNube();}}, busquedaStock, setBusquedaStock, productos, idEditProducto, setIdEditProducto, formEditProducto, setFormEditProducto, handleUpdateProductoBJ: async (id)=>{ await supabase.from('productos').update(formEditProducto).eq('id',id); setIdEditProducto(null); cargarTodoDesdeNube(); }, handleDeleteProductoBJ: async (id)=>{ if(confirm("Borrar?")){await supabase.from('productos').delete().eq('id',id); cargarTodoDesdeNube();} }, formEditStockBJ, setFormEditStockBJ, handleSincronizarStockBJ: async (id, s)=>{ await supabase.from('productos').update({stock:Number(s)}).eq('id',id); cargarTodoDesdeNube(); }, FUCSIA_PRINCIPAL, VERDE_BJ, ROJO_BJ, OSCURO_BJ, styleInp, styleCrd}} />}
        {vista === 'logistica' && <LogisticaSection {...{logisticaInteligente, handleCobrarDeudaBJ: async (g)=>{ for(let id of g.items_ids) await supabase.from('ventas').update({estado_pedido:'Entregado'}).eq('id',id); cargarTodoDesdeNube(); }, FUCSIA_PRINCIPAL, VERDE_BJ, AMARILLO_BJ, OSCURO_BJ, styleCrd}} />}
        {vista === 'contabilidad' && <GestionSection {...{balanceEliteBJ, valorizacionStockBJ:{cost:productos.reduce((acc,p)=>acc+(p.precio_compra*p.stock),0), vent:productos.reduce((acc,p)=>acc+(p.precio_venta*p.stock),0)}, analiticaProBJ, finanzas, idEditFinanza, setIdEditFinanza, formEditFinanza, setFormEditFinanza, handleUpdateFinanzaBJ: async (id)=>{ await supabase.from('finanzas').update(formEditFinanza).eq('id',id); setIdEditFinanza(null); cargarTodoDesdeNube(); }, formFinanzas, setFormFinanzas, handleRegistrarFinanzaBJ: async (e)=>{ e.preventDefault(); await supabase.from('finanzas').insert([{...formFinanzas, monto:Number(handleInputMonto(formFinanzas.monto))}]); cargarTodoDesdeNube(); }, FUCSIA_PRINCIPAL, VERDE_BJ, ROJO_BJ, AMARILLO_BJ, OSCURO_BJ, styleInp, styleCrd}} />}
      </main>
    </div>
  );
}