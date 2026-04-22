"use client";
/**
 * ============================================================================
 * SISTEMA: BUNKER BJ - MASTER CONTROL (v1.8.0 FONDO ÚNICO)
 * PROPIETARIO: Jean - B J Importaciones Chiclayo
 * CORRECCIÓN CRÍTICA:
 * - Eliminación del doble conteo de abonos en Caja Global.
 * - Unificación de Caja (Todo gasto sale de la misma caja física).
 * - Bóveda 100% informativa (Solo suma utilidades, no resta gastos).
 * ============================================================================
 */
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from './supabaseClient';
import { getFechaPeru, handleInputMonto, getHoraPeru, formatForInputDT } from '../lib/helpers';

import VentasSection from '../components/Ventas';
import AlmacenSection from '../components/Almacen';
import LogisticaSection from '../components/Logistica';
import GestionSection from '../components/Gestion';
import FinanzasSection from '../components/Finanzas';
import ClientesSection from '../components/Clientes';

export default function SistemaBJCMasterFinal() {
  
  // --- ESTADOS DE BASE DE DATOS ---
  const [efectivoRecibido, setEfectivoRecibido] = useState('');
  const [hasMounted, setHasMounted] = useState(false);
  const [productos, setProductos] = useState([]);
  const [ventas, setVentas] = useState([]);
  const [finanzas, setFinanzas] = useState([]);
  const [auditoriaLogs, setAuditoriaLogs] = useState([]); 
  const [vista, setVista] = useState('ventas'); 
  const [cargando, setCargando] = useState(true);
  // --- SISTEMA DE SEGURIDAD ---
  const PIN_MAESTRO = "232310"; // 🔐 CAMBIA ESTE NÚMERO POR TU CLAVE SECRETA
  const [accesoConcedido, setAccesoConcedido] = useState(false);
  const [pinIngresado, setPinIngresado] = useState('');
  const [errorPin, setErrorPin] = useState(false);

  // --- ESTADOS OPERATIVOS ---
  const [busqueda, setBusqueda] = useState(''); 
  const [busquedaStock, setBusquedaStock] = useState(''); 
  const [busquedaHistorial, setBusquedaHistorial] = useState('');
  const [fechaConsulta, setFechaConsulta] = useState(getFechaPeru());
 // --- ESTADOS OPERATIVOS CON VALORES POR DEFECTO ---
  const [cliente, setCliente] = useState('Tienda'); 
  const [localidad, setLocalidad] = useState('Chiclayo'); 
  const [telefono, setTelefono] = useState('');
  const [tipoVenta, setTipoVenta] = useState('Menor'); 
  const [cantidades, setCantidades] = useState({}); 
  const [coloresElegidos, setColoresElegidos] = useState({});
  const [carrito, setCarrito] = useState([]);
  const [descuento, setDescuento] = useState(0); 

  // --- ESTADOS DE FORMULARIOS ---
  const [formProd, setFormProd] = useState({ nombre: '', precio_compra: '', precio_venta: '', precio_menor: '', stock: '', colores: '' });
  const [formFinanzas, setFormFinanzas] = useState({ tipo: 'Gasto Local', descripcion: '', monto: '' });
  const [idEditFinanza, setIdEditFinanza] = useState(null);
  const [formEditFinanza, setFormEditFinanza] = useState({});
  const [idEditProducto, setIdEditProducto] = useState(null);
  const [formEditProducto, setFormEditProducto] = useState({});
  const [formEditStockBJ, setFormEditStockBJ] = useState({}); 

  // --- ESTILOS VISUALES ---
  const FUCSIA_PRINCIPAL = '#F01097';
  const VERDE_BJ = '#16A34A';
  const ROJO_BJ = '#E11D48';
  const AMARILLO_BJ = '#CA8A04';
  const OSCURO_BJ = '#1E1B1C';

  const styleInp = { padding: '16px', borderRadius: '16px', border: `2px solid #FCC2E2`, width: '100%', outline: 'none', fontSize: '16px', boxSizing: 'border-box', backgroundColor: '#fff' };
  const styleCrd = { backgroundColor: '#ffffff', borderRadius: '30px', padding: '25px', boxShadow: `0 15px 35px rgba(240, 16, 151, 0.05)`, border: '1px solid #FFF1F2', boxSizing: 'border-box' };

  
  // --- CARGA DE DATOS Y VERIFICACIÓN ---
  useEffect(() => { 
    setHasMounted(true); 
    const sesion = localStorage.getItem('bj_bunker_auth');
    if (sesion === 'acceso_total') {
        setAccesoConcedido(true);
        cargarTodoDesdeNube();
    } else {
        setCargando(false);
    }
  }, []);

  const intentarAcceso = (e) => {
    e.preventDefault();
    if (pinIngresado === PIN_MAESTRO) {
        localStorage.setItem('bj_bunker_auth', 'acceso_total');
        setAccesoConcedido(true);
        setErrorPin(false);
        setCargando(true);
        cargarTodoDesdeNube();
    } else {
        setErrorPin(true);
        setPinIngresado('');
    }
  };

  const cerrarSesion = () => {
    if(confirm("¿Bloquear el Búnker y cerrar sesión?")) {
        localStorage.removeItem('bj_bunker_auth');
        setAccesoConcedido(false);
        setPinIngresado('');
        setProductos([]); setVentas([]); setFinanzas([]); setAuditoriaLogs([]);
    }
  };

  const cargarTodoDesdeNube = async () => {
    try {
        const { data: p } = await supabase.from('productos').select('*').order('created_at', { ascending: false });
        const { data: v } = await supabase.from('ventas').select('*').order('created_at', { ascending: true });
        const { data: f } = await supabase.from('finanzas').select('*').order('created_at', { ascending: false });
        const { data: a } = await supabase.from('auditoria_bj').select('*').order('created_at', { ascending: true });
        if (p) setProductos(p); if (v) setVentas(v); if (f) setFinanzas(f); if (a) setAuditoriaLogs(a);
    } catch (e) { console.error("Error BJ Sync:", e); } finally { setCargando(false); }
  };

  // --- MATEMÁTICA EXACTA Y SIN DOBLE CONTEO ---
  const valorizacionStockBJ = useMemo(() => {
    let cost = 0; let vent = 0; let pot = 0; // <-- Agregada variable pot
    productos.forEach(p => { 
        if (Number(p.stock) > 0) { 
            cost += (Number(p.precio_compra || 0) * p.stock); 
            vent += (Number(p.precio_venta || 0) * p.stock); 
            pot += (Number(p.precio_venta || 0) - Number(p.precio_compra || 0)) * p.stock; // <-- Cálculo del potencial
        } 
    });
    return { cost, vent, pot }; // <-- Retorna pot
  }, [productos]);

  const balanceEliteBJ = useMemo(() => {
    const s = { cH: 0, gH: 0, cG: 0, bR: 0, pe_p: 0, pe_g: 0, pe_m: 0 };
    if (!ventas.length && !finanzas.length) return s;
    const hoyS = getFechaPeru();
    const mesI = hoyS.substring(0,7);

    // 1. CAJA GLOBAL FÍSICA (Tu dinero real en caja / Yape)
    // Se eliminó la auditoría de aquí para evitar el doble conteo de abonos antiguos.
    const ventasCompletadas = ventas
        .filter(v => v.estado_pedido === 'Entregado' || v.estado_pedido === 'En Almacén')
        .reduce((acc, v) => acc + (Number(v.precio_venta_unitario) * Number(v.cantidad)), 0);

    const ingresosAdmin = finanzas
        .filter(f => ['Ingreso Adicional', 'Inversión Inicial'].includes(f.tipo))
        .reduce((acc, f) => acc + Number(f.monto), 0);

    const gastosTotales = finanzas
        .filter(f => !['Ingreso Adicional', 'Inversión Inicial'].includes(f.tipo))
        .reduce((acc, f) => acc + Number(f.monto), 0);

    const cajaFisicaReal = (ventasCompletadas + ingresosAdmin) - gastosTotales;

    // 2. BÓVEDA INFORMATIVA (Solo suma tu éxito comercial)
    const utilidadHistorica = ventas
        .filter(v => v.estado_pedido !== 'Anulado')
        .reduce((acc, v) => acc + Number(v.ganancia_total || 0), 0);

    // 3. Métricas
    const utMes = ventas.filter(v => getFechaPeru(v.created_at).substring(0,7) === mesI && v.estado_pedido !== 'Anulado').reduce((acc, v) => acc + Number(v.ganancia_total || 0), 0);
    const exMes = finanzas.filter(f => getFechaPeru(f.created_at).substring(0,7) === mesI && ['Gasto Local','Retiro Personal'].includes(f.tipo)).reduce((acc, f) => acc + Number(f.monto), 0);

    return {
        cH: ventas.filter(v => getFechaPeru(v.created_at) === hoyS && v.estado_pedido !== 'Pendiente de Pago' && v.estado_pedido !== 'Anulado').reduce((acc, v) => acc + (v.precio_venta_unitario*v.cantidad), 0),
        gH: ventas.filter(v => getFechaPeru(v.created_at) === hoyS && v.estado_pedido !== 'Anulado').reduce((acc, v) => acc + Number(v.ganancia_total || 0), 0),
        cG: cajaFisicaReal,
        bR: utilidadHistorica,
        pe_p: exMes > 0 ? (utMes / exMes) * 100 : (utMes > 0 ? 100 : 0), pe_g: utMes, pe_m: exMes
    };
  }, [ventas, finanzas]);

  const analiticaProBJ = useMemo(() => {
    const counts = {}; 
    ventas.forEach(v => { 
        if(v.estado_pedido !== 'Anulado') { 
            const name = productos?.find(p => p.id === v.producto_id)?.nombre || "Modelo Eliminado"; 
            counts[name] = (counts[name] || 0) + v.cantidad; 
        } 
    });
    return { top: Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,5) };
  }, [ventas, productos]);

  const logisticaInteligente = useMemo(() => {
    const res = { almacen: [], deudas: [] };
    const mA = {}; const mD = {};
    ventas.forEach(v => {
        const key = `${v.cliente_nombre}-${v.localidad}`;
        const pM = productos?.find(p => p.id === v.producto_id);
        const it = { id: v.id, producto_id: v.producto_id, nombre: pM?.nombre, cantidad: v.cantidad, color: v.color, subtotal: (v.precio_venta_unitario * v.cantidad), precio: v.precio_venta_unitario };
        if (v.estado_pedido === 'En Almacén') { if(!mA[key]) mA[key]={cliente:v.cliente_nombre, localidad:v.localidad, items:[], items_ids:[], total:0}; mA[key].items.push(it); mA[key].items_ids.push(v.id); mA[key].total += it.subtotal; }
        if (v.estado_pedido === 'Pendiente de Pago') { if(!mD[key]) mD[key]={cliente:v.cliente_nombre, localidad:v.localidad, items:[], items_ids:[], total:0}; mD[key].items.push(it); mD[key].items_ids.push(v.id); mD[key].total += it.subtotal; }
    });
    res.almacen = Object.values(mA); res.deudas = Object.values(mD);
    return res;
  }, [ventas, productos]);

  const historialVentasDiaBJ = useMemo(() => {
    const filt = ventas.filter(v => getFechaPeru(v.created_at) === fechaConsulta && v.cliente_nombre?.toLowerCase().includes(busquedaHistorial.toLowerCase()));
    const groups = {};
    filt.forEach(v => {
        const hId = `${v.cliente_nombre}-${v.created_at?.substring(0,16)}`; 
        if (!groups[hId]) groups[hId] = { id_grupo: hId, cliente_nombre: v.cliente_nombre, localidad: v.localidad, telefono: v.telefono, hora: getHoraPeru(v.created_at), total: 0, items: [] };
        groups[hId].items.push(v); groups[hId].total += (Number(v.precio_venta_unitario) * v.cantidad);
    });
    return Object.values(groups).reverse();
  }, [ventas, fechaConsulta, busquedaHistorial]);

  const handleAutocompleteClienteBJ = (e) => {
    const valor = e.target.value; 
    setCliente(valor);
    
    // Si el usuario borra todo, regresamos a los valores base
    if (valor.trim() === '') {
        setLocalidad('Chiclayo');
        setTelefono('');
        return;
    }

    // Buscamos si este nombre ya nos ha comprado antes (CRM)
    const clienteFrecuente = ventas.find(v => 
        v.cliente_nombre?.toLowerCase() === valor.toLowerCase()
    );
    
    if (clienteFrecuente) { 
        // Si lo encontramos, cargamos su historial
        setLocalidad(clienteFrecuente.localidad || 'Chiclayo'); 
        setTelefono(clienteFrecuente.telefono || ''); 
    }
    // Si es un nombre nuevo, el usuario simplemente sigue escribiendo
  };
  const handleEjecutarVentaBJ = async (estado, abonoInicial = 0) => {
    if (!cliente || !localidad || carrito.length === 0) return alert("Faltan datos en el cliente o el carrito está vacío.");
    const snap = balanceEliteBJ.cG;
    const totalV = carrito.reduce((acc, i) => acc + (Number(i.precio_venta)*i.cantidad), 0);
    const montoHoy = (estado === 'Entregado' || estado === 'En Almacén') 
        ? (totalV - Number(descuento)) 
        : Number(efectivoRecibido);
    const ts = new Date().toISOString();

    const lista = carrito.map(i => ({ 
        cliente_nombre: cliente, localidad, telefono, producto_id: i.producto_id, 
        cantidad: i.cantidad, color: i.color, precio_venta_unitario: i.precio_venta, 
        precio_costo_unitario: i.precio_compra, ganancia_total: (Number(i.precio_venta)-Number(i.precio_compra))*i.cantidad, 
        estado_pedido: estado, created_at: ts 
    }));
const handleUpdateItemVentaBJ = async (id, data) => {
    try {
        // 1. Obtener el estado actual del ítem antes de editar
        const { data: itemOriginal } = await supabase.from('ventas').select('*').eq('id', id).single();
        if (!itemOriginal) return;

        const pO = productos.find(p => p.id === itemOriginal.producto_id);
        const snap = balanceEliteBJ.localCaja || balanceEliteBJ.cG; // Caja actual

        // 2. Calcular Diferenciales
        const diffCantidad = itemOriginal.cantidad - data.cantidad; // Si bajaste la cantidad, esto es positivo (vuelve al stock)
        const totalOriginal = itemOriginal.precio_venta_unitario * itemOriginal.cantidad;
        const totalNuevo = data.precio_venta_unitario * data.cantidad;
        const diffCaja = totalOriginal - totalNuevo; // Si el nuevo total es menor, esto es positivo (dinero que sale de caja)

        // 3. Actualizar Venta y Ganancia
        const nuevaGanancia = (data.precio_venta_unitario - itemOriginal.precio_costo_unitario) * data.cantidad;
        await supabase.from('ventas').update({ 
            cantidad: data.cantidad, 
            precio_venta_unitario: data.precio_venta_unitario, 
            ganancia_total: nuevaGanancia 
        }).eq('id', id);

        // 4. Ajustar Stock en Almacén
        if (pO && diffCantidad !== 0) {
            await supabase.from('productos').update({ stock: pO.stock + diffCantidad }).eq('id', pO.id);
        }

        // 5. Ajustar Caja Física si no fue Crédito
        if (itemOriginal.estado_pedido !== 'Pendiente de Pago' && diffCaja !== 0) {
            await supabase.from('auditoria_bj').insert([{ 
                cliente: itemOriginal.cliente_nombre, 
                operacion: 'CORRECCIÓN VENTA', 
                monto_operacion: -diffCaja, 
                caja_antes: snap, 
                caja_despues: snap - diffCaja 
            }]);
        }

        alert("✅ Ítem actualizado. Stock y Caja ajustados.");
        cargarTodoDesdeNube()
        setEfectivoRecibido('');
        ;
    } catch (e) {
        console.error("Error en update individual:", e);
    }
  };
    const { error } = await supabase.from('ventas').insert(lista);
    if (!error) {
        if (montoHoy > 0) {
            await supabase.from('auditoria_bj').insert([{ 
                cliente, operacion: estado === 'Pendiente de Pago' ? 'ABONO CRÉDITO' : (estado === 'En Almacén' ? 'PAGO RESERVA' : 'VENTA CASH'), 
                monto_operacion: montoHoy, caja_antes: snap, caja_despues: snap + montoHoy 
            }]);
        }
        for (const it of carrito) {
            const pO = productos.find(p => p.id === it.producto_id);
            if (pO) await supabase.from('productos').update({ stock: pO.stock - it.cantidad }).eq('id', it.producto_id);
        }
        setCarrito([]); setCliente('Tienda'); setDescuento(0); setLocalidad('Chiclayo'); setTelefono('');
        cargarTodoDesdeNube();
    }
  };

  const handleAnularVentaBJ = async (v) => {
   if (v.estado_pedido === 'Anulado') return alert("Este ítem ya fue anulado anteriormente.");
    if (confirm("ATENCIÓN: ¿Anular venta? Se devolverá el stock y se ajustará la caja física.")) {
        const snap = balanceEliteBJ.cG;
        const pO = productos.find(p => p.id === v.producto_id);
        
        // 1. Devolver Stock al Almacén
        if (pO) await supabase.from('productos').update({ stock: pO.stock + v.cantidad }).eq('id', pO.id);
        
        // 2. Rastrear cuánto dinero entró REALMENTE por esta venta
        let montoADevolver = 0;
        
        if (v.estado_pedido !== 'Pendiente de Pago') {
            // Si fue al contado o almacén, se devuelve el total exacto.
            montoADevolver = v.precio_venta_unitario * v.cantidad;
        } else {
            // Si fue crédito, buscamos en la auditoría si hubo un abono inicial ese mismo día/minuto
            const { data: logsRelacionados } = await supabase
                .from('auditoria_bj')
                .select('*')
                .eq('cliente', v.cliente_nombre)
                .eq('operacion', 'ABONO CRÉDITO')
                .gte('created_at', new Date(new Date(v.created_at).getTime() - 60000).toISOString())
                .lte('created_at', new Date(new Date(v.created_at).getTime() + 60000).toISOString());
            
            if (logsRelacionados && logsRelacionados.length > 0) {
                montoADevolver = logsRelacionados[0].monto_operacion;
            }
        }

        // 3. Ejecutar la devolución en la Caja Negra
        if (montoADevolver > 0) {
            await supabase.from('auditoria_bj').insert([{ 
                cliente: v.cliente_nombre, 
                operacion: 'ANULACIÓN VENTA', 
                monto_operacion: -montoADevolver, 
                caja_antes: snap, 
                caja_despues: snap - montoADevolver 
            }]);
        }
        
        // 4. Borrar el registro de venta
        await supabase.from('ventas').update({ estado_pedido: 'Anulado' }).eq('id', v.id);
        cargarTodoDesdeNube();
    }
  };

  const handleRegistrarFinanzaBJ = async (e) => {
    e.preventDefault();
    const pre = balanceEliteBJ.cG;
    const mF = Number(handleInputMonto(formFinanzas.monto));
    const esGasto = !['Ingreso Adicional', 'Inversión Inicial'].includes(formFinanzas.tipo);
    const delta = esGasto ? -mF : mF;

    const { error } = await supabase.from('finanzas').insert([{ ...formFinanzas, monto: mF }]);
    if (!error) {
        await supabase.from('auditoria_bj').insert([{ 
            cliente: 'ADMINISTRATIVO', 
            operacion: formFinanzas.tipo.toUpperCase(), 
            monto_operacion: delta, 
            caja_antes: pre, 
            caja_despues: pre + delta 
        }]);
        setFormFinanzas({ tipo: 'Gasto Local', descripcion: '', monto: '' });
        cargarTodoDesdeNube();
    }
  };
const handleUpdateItemVentaBJ = async (id, data) => {
    try {
        // 1. Buscamos el registro viejo antes de cambiarlo
        const { data: itemOriginal } = await supabase.from('ventas').select('*').eq('id', id).single();
        if (!itemOriginal) return;

        const pO = productos.find(p => p.id === itemOriginal.producto_id);
        const snap = balanceEliteBJ.cG; // Caja actual

        // 2. CÁLCULO DE DIFERENCIALES
        // Stock: Si antes eran 5 y ahora son 3, devolvemos 2 al stock (+2)
        const diffCantidad = Number(itemOriginal.cantidad) - Number(data.cantidad);
        
        // Dinero: Si antes pagó S/100 y ahora S/60, devolvemos S/40 a la caja
        const totalOriginal = itemOriginal.precio_venta_unitario * itemOriginal.cantidad;
        const totalNuevo = data.precio_venta_unitario * data.cantidad;
        const diffCaja = totalOriginal - totalNuevo;

        // 3. ACTUALIZAR VENTA EN SUPABASE
        const nuevaGanancia = (data.precio_venta_unitario - itemOriginal.precio_costo_unitario) * data.cantidad;
       await supabase.from('ventas').update({ 
    cantidad: Number(data.cantidad), 
    precio_venta_unitario: Number(data.precio_venta_unitario), 
    ganancia_total: nuevaGananciaTotal // 👈 Esto es lo que mantiene tu KPI de "Ganancia Hoy" exacto
}).eq('id', id);

        // 4. REVERTIR STOCK SI CAMBIÓ LA CANTIDAD
        if (pO && diffCantidad !== 0) {
            await supabase.from('productos').update({ stock: pO.stock + diffCantidad }).eq('id', pO.id);
        }

        // 5. REVERTIR DINERO SI FUE AL CONTADO/ALMACÉN
        if (itemOriginal.estado_pedido !== 'Pendiente de Pago' && diffCaja !== 0) {
            await supabase.from('auditoria_bj').insert([{ 
                cliente: itemOriginal.cliente_nombre, 
                operacion: 'CORRECCIÓN DE PRECIO/CANTIDAD', 
                monto_operacion: -diffCaja, 
                caja_antes: snap, 
                caja_despues: snap - diffCaja 
            }]);
        }

        alert("✅ Ítem actualizado. Stock y Caja ajustados automáticamente.");
        cargarTodoDesdeNube();
    } catch (e) {
        console.error("Error en la edición individual:", e);
    }
};
  const handleExportarExcelCajaFull = () => {
    let csv = "\uFEFF"; csv += "CLIENTE,HORA,PRODUCTO,CANT,V.UNIT,SUBTOTAL\n";
    historialVentasDiaBJ.forEach(g => {
        g.items.forEach(it => {
            const pN = productos.find(p => p.id === it.producto_id)?.nombre || "Modelo Eliminado";
            const sub = it.cantidad * it.precio_venta_unitario;
            csv += `${g.cliente_nombre},${g.hora},${pN},${it.cantidad},${it.precio_venta_unitario},${sub}\n`;
        });
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `BJ_FORENSE_${fechaConsulta}.csv`);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  if (!hasMounted) return null;
  // =========================================================================
  // PANTALLA DE BLOQUEO
  // =========================================================================
  if (!hasMounted) return null;
  
  if (!accesoConcedido) {
      return (
          <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: OSCURO_BJ, color: '#fff', fontFamily: 'system-ui, sans-serif' }}>
              <div style={{ backgroundColor: '#ffffff10', padding: '40px', borderRadius: '30px', border: `1px solid ${FUCSIA_PRINCIPAL}50`, textAlign: 'center', maxWidth: '350px', width: '90%' }}>
                  <div style={{ backgroundColor: FUCSIA_PRINCIPAL, color: '#fff', width: '60px', height: '60px', borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '24px', margin: '0 auto 20px auto' }}>BJ</div>
                  <h2 style={{ margin: '0 0 10px 0', fontWeight: '900', letterSpacing: '1px' }}>BÚNKER PRIVADO</h2>
                  <p style={{ fontSize: '13px', color: '#94A3B8', marginBottom: '30px' }}>Ingresa tu código de seguridad.</p>
                  
                  <form onSubmit={intentarAcceso} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                      <input 
                          type="password" 
                          value={pinIngresado} 
                          onChange={(e) => setPinIngresado(e.target.value)} 
                          placeholder="Código PIN" 
                          autoFocus
                          style={{ padding: '18px', borderRadius: '15px', border: errorPin ? `2px solid ${ROJO_BJ}` : 'none', outline: 'none', fontSize: '20px', textAlign: 'center', fontWeight: '900', backgroundColor: '#fff', color: OSCURO_BJ, letterSpacing: '5px' }} 
                      />
                      {errorPin && <small style={{ color: ROJO_BJ, fontWeight: '900' }}>Código Incorrecto</small>}
                      <button type="submit" style={{ backgroundColor: FUCSIA_PRINCIPAL, color: '#fff', border: 'none', padding: '18px', borderRadius: '15px', fontWeight: '900', cursor: 'pointer', fontSize: '16px', marginTop: '10px' }}>
                          DESBLOQUEAR 🔓
                      </button>
                  </form>
              </div>
          </div>
      );
  }
  if (cargando) return <div style={{ height:'100vh', display:'flex', alignItems:'center', justifyContent:'center', backgroundColor:'#FFF5F7', color:FUCSIA_PRINCIPAL, fontWeight:'900' }}>BUNKER BJ: CARGANDO SISTEMA CENTRAL... 🚀</div>;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#FFF5F7', color: OSCURO_BJ, fontFamily: 'system-ui, sans-serif' }}>
      <header style={{ backgroundColor: '#ffffff', padding: '10px 5%', position: 'sticky', top: 0, zIndex: 100, boxShadow: `0 4px 15px rgba(0,0,0,0.06)` }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ backgroundColor: FUCSIA_PRINCIPAL, color: '#fff', width: '38px', height: '38px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '14px' }}>BJ</div>
              <h1 style={{ margin: 0, fontSize: '0.9rem', fontWeight: '900', color: FUCSIA_PRINCIPAL }}>BJ IMPORTACIONES</h1>
            </div>
            <small style={{ fontSize: '10px', fontWeight: '900', opacity: 0.4 }}>v1.9.0 UNIFICADO</small>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <small style={{ fontSize: '10px', fontWeight: '900', opacity: 0.4 }}>v2.0.0</small>
                {/* BOTÓN DE BLOQUEO MANUAL */}
                <button onClick={cerrarSesion} style={{ backgroundColor: '#FEF2F2', color: ROJO_BJ, border: `1px solid ${ROJO_BJ}50`, padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', fontWeight: '900', fontSize: '11px' }}>
                    BLOQUEAR 🔒
                </button>
            </div>
          </div>
          <nav style={{ display: 'flex', gap: '5px', overflowX: 'auto', paddingBottom: '5px', WebkitOverflowScrolling: 'touch' }}>
            {/* AGREGADO 'finanzas' AL ARREGLO */}
            {['ventas', 'stock', 'logistica', 'finanzas', 'clientes', 'contabilidad'].map(t => (
              <button key={t} onClick={() => setVista(t)} style={{ flex: '0 0 auto', backgroundColor: vista === t ? FUCSIA_PRINCIPAL : '#FCA5D415', border: 'none', color: vista === t ? '#fff' : FUCSIA_PRINCIPAL, padding: '12px 18px', borderRadius: '12px', cursor: 'pointer', fontWeight: '900', fontSize: '11px' }}>
                {t === 'contabilidad' ? 'GESTIÓN' : (t === 'clientes' ? 'CRM' : t.toUpperCase())}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '15px' }}>
        {vista === 'ventas' && <VentasSection {...{ balanceEliteBJ, handleUpdateItemVentaBJ, fechaConsulta, setFechaConsulta, efectivoRecibido, setEfectivoRecibido, handleExportarExcelCajaFull, tipoVenta, setTipoVenta, cliente, handleAutocompleteCliente: handleAutocompleteClienteBJ, ventas, localidad, setLocalidad, telefono, setTelefono, carrito, setCarrito, descuento, setDescuento, handleEjecutarVentaBJ, busqueda, setBusqueda, productos, coloresElegidos, setColoresElegidos, cantidades, setCantidades, busquedaHistorial, setBusquedaHistorial, historialVentasDiaBJ, handleAnularVentaBJ, analiticaProBJ, FUCSIA_PRINCIPAL, VERDE_BJ, ROJO_BJ, AMARILLO_BJ, OSCURO_BJ, styleInp, styleCrd }} />}
        
        {vista === 'stock' && <AlmacenSection {...{ formProd, setFormProd, handleAddProductoBJ: async (e)=>{e.preventDefault(); await supabase.from('productos').insert([formProd]); setFormProd({nombre:'', precio_compra:'', precio_venta:'', precio_menor:'', stock:'', colores:''}); cargarTodoDesdeNube();}, busquedaStock, setBusquedaStock, productos, idEditProducto, setIdEditProducto, formEditProducto, setFormEditProducto, handleUpdateProductoBJ: async (id)=>{await supabase.from('productos').update(formEditProducto).eq('id',id); setIdEditProducto(null); cargarTodoDesdeNube();}, handleDeleteProductoBJ: async (id,n)=>{if(confirm(`¿Estás seguro de borrar ${n}?`)){await supabase.from('productos').delete().eq('id',id); cargarTodoDesdeNube();}}, formEditStockBJ, setFormEditStockBJ, handleSincronizarStockBJ: async (id,s)=>{await supabase.from('productos').update({stock:Number(s)}).eq('id',id); cargarTodoDesdeNube();}, FUCSIA_PRINCIPAL, VERDE_BJ, ROJO_BJ, OSCURO_BJ, styleInp, styleCrd }} />}

        {vista === 'logistica' && <LogisticaSection {...{ logisticaInteligente, handleCobrarDeudaBJ: async (g,m)=>{const pre=balanceEliteBJ.cG; for(let id of g.items_ids){await supabase.from('ventas').update({estado_pedido:'Entregado'}).eq('id',id);} if(Number(m)>0){await supabase.from('auditoria_bj').insert([{cliente:g.cliente,operacion:'COBRO SALDO',monto_operacion:Number(m),caja_antes:pre,caja_despues:pre+Number(m)}]);} cargarTodoDesdeNube();}, handleAnularCreditoBJ: async (g)=>{for(const it of g.items){const pO=productos.find(p=>p.id===it.producto_id); if(pO) await supabase.from('productos').update({stock:pO.stock+it.cantidad}).eq('id',pO.id);} await supabase.from('ventas').delete().in('id',g.items_ids); cargarTodoDesdeNube();}, handleUpdateItemLogistica: async (id,data,idA,cantA)=>{ if(data.producto_id!==idA||data.cantidad!==cantA){const pAnt=productos.find(p=>p.id===idA); if(pAnt) await supabase.from('productos').update({stock:pAnt.stock+Number(cantA)}).eq('id',pAnt.id); const pNue=productos.find(p=>p.id===data.producto_id); if(pNue) await supabase.from('productos').update({stock:pNue.stock-Number(data.cantidad)}).eq('id',pNue.id);} await supabase.from('ventas').update(data).eq('id',id); cargarTodoDesdeNube();}, handleEliminarItemIndividualLogistica: async (v)=>{const pO=productos.find(p=>p.id===v.producto_id); if(pO) await supabase.from('productos').update({stock:pO.stock+v.cantidad}).eq('id',pO.id); await supabase.from('ventas').update({ estado_pedido: 'Anulado' }).eq('id', v.id); cargarTodoDesdeNube();}, productos, finanzas, FUCSIA_PRINCIPAL, VERDE_BJ, AMARILLO_BJ, ROJO_BJ, OSCURO_BJ, styleCrd, styleInp }} />}


{vista === 'finanzas' && <FinanzasSection {...{ ventas, productos, finanzas, balanceEliteBJ, FUCSIA_PRINCIPAL, VERDE_BJ, ROJO_BJ, AMARILLO_BJ, OSCURO_BJ, styleInp, styleCrd }} />}

{vista === 'clientes' && <ClientesSection {...{ ventas, FUCSIA_PRINCIPAL, VERDE_BJ, OSCURO_BJ, styleCrd, styleInp }} />}

        {vista === 'contabilidad' && <GestionSection {...{ balanceEliteBJ, valorizacionStockBJ, analiticaProBJ, finanzas, idEditFinanza, setIdEditFinanza, formEditFinanza, setFormEditFinanza, handleUpdateFinanzaBJ: async (id)=>{await supabase.from('finanzas').update(formEditFinanza).eq('id',id); setIdEditFinanza(null); cargarTodoDesdeNube();}, formFinanzas, setFormFinanzas, handleRegistrarFinanzaBJ, FUCSIA_PRINCIPAL, VERDE_BJ, ROJO_BJ, AMARILLO_BJ, OSCURO_BJ, styleInp, styleCrd }} />}
      </main>
    </div>
  );
}