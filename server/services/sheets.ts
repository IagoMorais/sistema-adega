import { google, sheets_v4 } from "googleapis";
import { GoogleAuth } from "google-auth-library";
import { Product } from "@shared/schema";

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

type SheetSale = {
  id: number;
  productId: number;
  quantity: number;
  totalAmount: number | string;
  paymentMethod: string | null;
  createdAt: string | Date;
};

export class GoogleSheetsService {
  private auth: GoogleAuth | null = null;
  private sheets: sheets_v4.Sheets | null = null;
  private spreadsheetId?: string;
  private isEnabled: boolean = false;
  private isInitialized: boolean = false;

  constructor() {
    // Defer initialization to prevent blocking server startup
    this.initializeAsync().catch(console.error);
  }

  private async initializeAsync() {
    try {
      const privateKey = process.env.GOOGLE_SHEETS_PRIVATE_KEY;
      const clientEmail = process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
      const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

      if (!privateKey || !clientEmail || !spreadsheetId) {
        console.log('Google Sheets: Credenciais não configuradas, sincronização desabilitada');
        return;
      }

      // Limpar a chave privada de possíveis caracteres de escape
      let cleanPrivateKey;
      try {
        // Tenta tratar a chave como JSON string
        if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
          cleanPrivateKey = JSON.parse(privateKey);
        } else {
          cleanPrivateKey = privateKey
            .replace(/\\n/g, '\n')
            .replace(/^"|"$/g, '')
            .trim();
        }
      } catch (e) {
        console.error('Google Sheets: Erro ao processar private key:', e);
        cleanPrivateKey = privateKey;
      }

      if (!cleanPrivateKey.includes('-----BEGIN PRIVATE KEY-----')) {
        console.error('Google Sheets: Formato de chave privada inválido');
        return;
      }

      this.spreadsheetId = spreadsheetId;

      this.auth = new GoogleAuth({
        credentials: {
          type: 'service_account',
          private_key: cleanPrivateKey,
          client_email: clientEmail,
          token_url: 'https://oauth2.googleapis.com/token',
          universe_domain: 'googleapis.com'
        },
        scopes: SCOPES,
      });

      this.sheets = google.sheets({ version: 'v4', auth: this.auth });
      
      // Teste de conexão
      const test = await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId
      });
      
      if (test.status !== 200) {
        throw new Error(`Conexão falhou com status ${test.status}`);
      }
      
      this.isEnabled = true;

      // Setup spreadsheet after initialization
      await this.setupSpreadsheet();
      this.isInitialized = true;
      console.log('Google Sheets: Serviço inicializado com sucesso');
    } catch (error) {
      console.error('Google Sheets: Erro ao inicializar:', error);
      if (error instanceof Error) {
        console.error('Detalhes do erro:', error.message);
        console.error('Stack trace:', error.stack);
      }
      this.isEnabled = false;
      this.isInitialized = false;
    }
  }

  private async safeSheetOperation<T>(operation: () => Promise<T>): Promise<T | void> {
    if (!this.isEnabled || !this.sheets || !this.spreadsheetId) {
      console.log('Google Sheets: Operação ignorada - serviço não está habilitado');
      return;
    }

    try {
      return await operation();
    } catch (error) {
      console.error('Google Sheets: Erro na operação:', error);
      if (error instanceof Error) {
        console.error('Detalhes do erro:', error.message);
        console.error('Stack trace:', error.stack);
      }
    }
  }

  async syncProducts(products: Product[]) {
    if (!this.isInitialized) {
      console.log('Google Sheets: Aguardando inicialização para sincronizar produtos');
      return;
    }

    return this.safeSheetOperation(async () => {
      console.log('Google Sheets: Sincronizando produtos...');

      // Non-null assertion is safe here because safeSheetOperation checks for this.sheets
      await this.sheets!.spreadsheets.values.clear({
        spreadsheetId: this.spreadsheetId,
        range: 'Produtos!A2:F',
      });

      const values = products.map(product => [
        product.id,
        product.name,
        product.brand,
        product.price.toString(),
        product.quantity.toString(),
        product.minStockLevel.toString(),
      ]);

      await this.sheets!.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: 'Produtos!A2',
        valueInputOption: 'RAW',
        requestBody: { values },
      });
      console.log('Google Sheets: Produtos sincronizados com sucesso');
    });
  }

  async syncSales(sales: SheetSale[]) {
    if (!this.isInitialized) {
      console.log('Google Sheets: Aguardando inicialização para sincronizar vendas');
      return;
    }

    return this.safeSheetOperation(async () => {
      console.log('Google Sheets: Sincronizando vendas...');

      await this.sheets!.spreadsheets.values.clear({
        spreadsheetId: this.spreadsheetId,
        range: 'Vendas!A2:F',
      });

      const values = sales.map(sale => [
        sale.id.toString(),
        sale.productId.toString(),
        sale.quantity.toString(),
        String(sale.totalAmount),
        sale.paymentMethod ?? '',
        new Date(sale.createdAt).toLocaleString('pt-BR'),
      ]);

      await this.sheets!.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: 'Vendas!A2',
        valueInputOption: 'RAW',
        requestBody: { values },
      });
      console.log('Google Sheets: Vendas sincronizadas com sucesso');
    });
  }

  private async setupSpreadsheet() {
    return this.safeSheetOperation(async () => {
      console.log('Google Sheets: Configurando planilha...');

      try {
        const requests = [
          {
            addSheet: {
              properties: {
                title: 'Produtos',
                gridProperties: {
                  rowCount: 1000,
                  columnCount: 6,
                },
              },
            },
          },
          {
            addSheet: {
              properties: {
                title: 'Vendas',
                gridProperties: {
                  rowCount: 1000,
                  columnCount: 6,
                },
              },
            },
          },
        ];

        await this.sheets!.spreadsheets.batchUpdate({
          spreadsheetId: this.spreadsheetId,
          requestBody: { requests },
        });
        console.log('Google Sheets: Abas criadas com sucesso');
      } catch (error) {
        console.log('Google Sheets: Abas já existem, configurando cabeçalhos...');
      }

      const produtosHeaders = [['ID', 'Nome', 'Marca', 'Preço', 'Quantidade', 'Estoque Mínimo']];
      const vendasHeaders = [['ID', 'Produto ID', 'Quantidade', 'Valor Total', 'Método de Pagamento', 'Data']];

      await Promise.all([
        this.sheets!.spreadsheets.values.update({
          spreadsheetId: this.spreadsheetId,
          range: 'Produtos!A1',
          valueInputOption: 'RAW',
          requestBody: { values: produtosHeaders },
        }),
        this.sheets!.spreadsheets.values.update({
          spreadsheetId: this.spreadsheetId,
          range: 'Vendas!A1',
          valueInputOption: 'RAW',
          requestBody: { values: vendasHeaders },
        }),
      ]);
      console.log('Google Sheets: Cabeçalhos configurados com sucesso');
    });
  }
}

export const sheetsService = new GoogleSheetsService();
