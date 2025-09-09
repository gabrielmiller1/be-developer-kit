import { Button } from "@/components/ui/button"

function App() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-8">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-foreground">
            BE Developer Kit
          </h1>
          <p className="text-lg text-muted-foreground">
            Teste do Tailwind CSS + shadcn/ui
          </p>
        </div>
        
        <div className="bg-card text-card-foreground rounded-lg border p-6 shadow-sm">
          <h2 className="text-2xl font-semibold mb-4">Teste de Componentes</h2>
          <div className="space-y-4">
            <div className="flex gap-4 flex-wrap">
              <Button>Botão Padrão</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-primary/10 p-4 rounded-md">
                <h3 className="font-medium text-primary">Primary Color</h3>
                <p className="text-sm text-muted-foreground">Testando cores</p>
              </div>
              <div className="bg-secondary p-4 rounded-md">
                <h3 className="font-medium">Secondary Color</h3>
                <p className="text-sm text-muted-foreground">Testando cores</p>
              </div>
              <div className="bg-accent p-4 rounded-md">
                <h3 className="font-medium">Accent Color</h3>
                <p className="text-sm text-muted-foreground">Testando cores</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Se você está vendo este layout estilizado, o Tailwind CSS + shadcn/ui está funcionando! 🎉
          </p>
        </div>
      </div>
    </div>
  )
}

export default App
