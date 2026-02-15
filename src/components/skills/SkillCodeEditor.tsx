import React, { useState } from "react";
import Editor from "@monaco-editor/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Copy, RotateCcw, Wand2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  code: string;
  onChange: (code: string) => void;
  edgeFunctionName: string;
  skillType?: string;
}

const DEFAULT_TEMPLATE = `import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    
    // TODO: Implement your skill logic here
    const result = { success: true, message: "Skill executed successfully", data: body };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
`;

const JS_TEMPLATE = `// Skill JavaScript — recebe "params" como objeto de entrada
// Retorne o resultado da skill no final

const now = new Date();

// Exemplo: retornar data/hora formatada
return {
  success: true,
  data: {
    iso: now.toISOString(),
    formatted: now.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }),
    timestamp: now.getTime(),
  },
};
`;

export function SkillCodeEditor({ code, onChange, edgeFunctionName, skillType = "edge_function" }: Props) {
  const isJS = skillType === "javascript";
  const handleCopy = () => {
    navigator.clipboard.writeText(code || "");
    toast.success("Código copiado!");
  };

  const handleReset = () => {
    onChange(isJS ? JS_TEMPLATE : DEFAULT_TEMPLATE);
    toast.info(isJS ? "Template JavaScript restaurado" : "Template padrão restaurado");
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>{isJS ? "Código JavaScript" : "Código da Edge Function"}</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            {isJS 
              ? <>Tipo: <code className="bg-muted px-1 rounded">JavaScript</code> — executado pelo executor universal. Use <code className="bg-muted px-1 rounded">params</code> para acessar os parâmetros de entrada.</>
              : <>Function: <code className="bg-muted px-1 rounded">{edgeFunctionName || "não definida"}</code></>
            }
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={handleReset}>
            <RotateCcw className="h-3.5 w-3.5 mr-1" /> Template
          </Button>
          <Button size="sm" variant="outline" onClick={handleCopy}>
            <Copy className="h-3.5 w-3.5 mr-1" /> Copiar
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="border rounded-md overflow-hidden">
          <Editor
            height="500px"
            defaultLanguage="typescript"
            value={code || ""}
            onChange={(v) => onChange(v || "")}
            theme="vs-dark"
            options={{
              minimap: { enabled: false },
              fontSize: 13,
              lineNumbers: "on",
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 2,
              wordWrap: "on",
              padding: { top: 12 },
            }}
          />
        </div>
      </CardContent>
    </Card>
  );
}

export { DEFAULT_TEMPLATE };
