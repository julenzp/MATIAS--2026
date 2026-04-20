import { supabase } from '@/integrations/supabase/client';

export async function logModificacion(
  tabla: string,
  idRegistro: string,
  campoModificado: string,
  valorAnterior: string,
  valorNuevo: string,
  motivo: string
) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const code = user?.email?.split('@')[0]?.toUpperCase() || 'EMPRESA';

    await supabase.from('activity_log' as any).insert({
      user_code: code,
      action_type: 'modificacion',
      page_name: 'panel-modificaciones',
      details: {
        tabla,
        id_registro: idRegistro,
        campo_modificado: campoModificado,
        valor_anterior: valorAnterior,
        valor_nuevo: valorNuevo,
        motivo,
      },
    });
  } catch {
    // Fire and forget
  }
}
