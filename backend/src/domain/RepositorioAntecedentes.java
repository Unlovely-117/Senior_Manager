package domain;

import domain.entities.Antecedente;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface RepositorioAntecedentes {
    void guardar(Antecedente antecedente);
    Optional<Antecedente> buscarPorId(UUID id);
    List<Antecedente> listarPorPaciente(UUID pacienteId);
    boolean actualizar(Antecedente antecedente);
}
