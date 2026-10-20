import { z } from 'zod';
import { currentUser } from '@/lib/auth';
import { assetResponse } from '@/lib/media-assets';
import { errorResponse } from '@/lib/http';
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    return await assetResponse(z.uuid().parse((await params).id), await currentUser());
  } catch (error) {
    return errorResponse(error);
  }
}
