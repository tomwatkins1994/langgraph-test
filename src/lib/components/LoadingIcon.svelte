<script>
import { LoaderCircle } from "lucide-svelte";
</script>
    
<div class="rotating">
    <LoaderCircle />
</div>

<style>
    .rotating {
      animation: rotate 2s linear infinite; /* Animation properties */
    }
  
    @keyframes rotate {
      from {
        transform: rotate(0deg);
      }
      to {
        transform: rotate(360deg);
      }
    }
</style>