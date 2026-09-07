import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Upload, FileType, CheckCircle2, AlertCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { importsApi } from '@/lib/api/imports';
import { toast } from '@/components/ui/toast';
import { useAuth } from '@/components/providers/AuthProvider';
import { queryKeys } from '@/lib/query-keys';

export function DatasetUploadDialog() {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<{ progress: number; status: string } | null>(null);
  const queryClient = useQueryClient();
  const { user } = useAuth();

  useEffect(() => {
    if (!open) {
      setProgress(null);
      setFile(null);
      mutation.reset();
    }
  }, [open]);

  const mutation = useMutation({
    mutationFn: (f: File) => importsApi.uploadCsv(f),
    onSuccess: (data) => {
      toast.add({
        title: 'Dataset Uploaded',
        description: data.message,
        type: 'success',
      });
      // Start progress tracking via WS. Do not close dialog immediately.
      setProgress({ progress: 0, status: 'Starting background processing...' });
    },
    onError: (error: Error) => {
      toast.add({
        title: 'Upload Failed',
        description: error.message || 'An error occurred while uploading the dataset.',
        type: 'error',
      });
    },
  });

  useEffect(() => {
    if (!mutation.isSuccess || !user) return;

    // Use a hardcoded fallback or environment variable for the websocket URL
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
    const wsUrl = apiUrl.replace('http', 'ws') + `/ws/etl-progress/${user.id}`;
    
    const ws = new WebSocket(wsUrl);
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setProgress(data);
        if (data.progress === 100) {
          queryClient.invalidateQueries({ queryKey: queryKeys.reports.all });
          queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
          toast.add({ title: 'Processing Complete', description: 'Data is now available.', type: 'success' });
          ws.close();
          setTimeout(() => setOpen(false), 2000);
        }
      } catch (e) {
        console.error('Failed to parse WS message', e);
      }
    };
    
    return () => {
      ws.close();
    };
  }, [mutation.isSuccess, user, queryClient]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.name.endsWith('.csv') || selectedFile.type === 'text/csv') {
        setFile(selectedFile);
      } else {
        toast.add({
          title: 'Invalid File',
          description: 'Please select a CSV file.',
          type: 'error',
        });
      }
    }
  };

  const handleUpload = () => {
    if (file) {
      mutation.mutate(file);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 gap-2">
        <Upload className="h-4 w-4" />
        Bulk Upload
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Upload Dataset</DialogTitle>
          <DialogDescription>
            Upload a CSV file containing safety reports. The system will automatically parse the data, run NLP analysis, and rebuild the precursor intelligence graph.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-6 hover:bg-muted/50 transition-colors">
            <input
              type="file"
              id="csv-upload"
              accept=".csv,text/csv"
              className="hidden"
              onChange={handleFileChange}
              disabled={mutation.isPending || mutation.isSuccess}
            />
            <label
              htmlFor="csv-upload"
              className="cursor-pointer flex flex-col items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {file ? (
                <>
                  <FileType className="h-8 w-8 text-primary" />
                  <span className="text-sm font-medium text-foreground">{file.name}</span>
                  <span className="text-xs">{(file.size / 1024).toFixed(1)} KB</span>
                </>
              ) : (
                <>
                  <Upload className="h-8 w-8 mb-2" />
                  <span className="text-sm font-medium">Click to select a CSV file</span>
                  <span className="text-xs text-muted-foreground">Supported format: .csv</span>
                </>
              )}
            </label>
          </div>

          {mutation.isPending && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground animate-pulse">
              <Upload className="h-4 w-4 animate-bounce" />
              Uploading dataset to server...
            </div>
          )}
          
          {progress && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-medium">
                <span>{progress.status}</span>
                <span>{progress.progress}%</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${progress.progress}%` }} 
                />
              </div>
            </div>
          )}
          
          {mutation.isError && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              Failed to upload dataset.
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={mutation.isPending || (progress != null && progress.progress < 100)}>
            Close
          </Button>
          <Button onClick={handleUpload} disabled={!file || mutation.isPending || mutation.isSuccess}>
            {mutation.isPending ? 'Uploading...' : 'Upload & Process'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
