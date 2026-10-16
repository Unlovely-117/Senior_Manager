package domain.entities;

import java.util.List;

/** A bounded and stably ordered page of patient assignment summaries. */
public final class PaginaPacientesAsignacion {
    private final List<PacienteAsignacionResumen> items;
    private final int page;
    private final int size;
    private final long total;

    public PaginaPacientesAsignacion(List<PacienteAsignacionResumen> items, int page, int size, long total) {
        this.items = List.copyOf(items);
        this.page = page;
        this.size = size;
        this.total = total;
    }

    public List<PacienteAsignacionResumen> getItems() { return items; }
    public int getPage() { return page; }
    public int getSize() { return size; }
    public long getTotal() { return total; }
}
